import { describe, expect, it } from 'vitest';
import {
  normalizeCedictPinyin,
  parseCedict,
  parseCedictLine,
  pinyinSyllableToNumeric,
  pinyinToNumeric,
} from '../src/pipeline/cedict.js';

describe('parseCedictLine', () => {
  it('parses a data line into traditional/simplified/pinyin/meanings', () => {
    const line = '你好 你好 [ni3 hao3] /xin chào/chào/';
    expect(parseCedictLine(line)).toEqual({
      traditional: '你好',
      simplified: '你好',
      pinyin: 'ni3 hao3',
      meanings: ['xin chào', 'chào'],
    });
  });

  it('returns null for comment lines and blank lines', () => {
    expect(parseCedictLine('# a comment')).toBeNull();
    expect(parseCedictLine('')).toBeNull();
    expect(parseCedictLine('   ')).toBeNull();
  });

  it('returns null for a line that does not match the CEDICT shape', () => {
    expect(parseCedictLine('not a cedict line')).toBeNull();
  });

  it('filters out CVDICT classifier ("LT:") annotations from meanings', () => {
    // Real CVDICT.u8 line for 朋友.
    const line = '朋友 朋友 [peng2 you5] /bạn/LT:個|个[ge4],位[wei4]/';
    expect(parseCedictLine(line)).toEqual({
      traditional: '朋友',
      simplified: '朋友',
      pinyin: 'peng2 you5',
      meanings: ['bạn'],
    });
  });

  it('filters a classifier annotation even when another sense follows it', () => {
    // Real CVDICT.u8 line for 下午: "p.m." appears as a genuine sense after LT:.
    const line = '下午 下午 [xia4 wu3] /buổi chiều/LT:個|个[ge4]/p.m./';
    expect(parseCedictLine(line)).toEqual({
      traditional: '下午',
      simplified: '下午',
      pinyin: 'xia4 wu3',
      meanings: ['buổi chiều', 'p.m.'],
    });
  });

  it('filters a classifier annotation with a space after the colon', () => {
    // Real CVDICT.u8 line for 丈夫: "LT: 個|个[ge4]" has a space after "LT:".
    const line = '丈夫 丈夫 [zhang4 fu5] /chồng/LT: 個|个[ge4]/';
    expect(parseCedictLine(line)).toEqual({
      traditional: '丈夫',
      simplified: '丈夫',
      pinyin: 'zhang4 fu5',
      meanings: ['chồng'],
    });
  });

  it('filters the spelled-out "Lượng từ:" classifier annotation', () => {
    // Real CVDICT.u8 line for 血 (packages/content/raw/CVDICT.u8:95905).
    const line = '血 血 [xue4] /máu/khẩu ngữ đọc là [xie3]/Lượng từ: 滴[di1],片[pian4]/';
    expect(parseCedictLine(line)).toEqual({
      traditional: '血',
      simplified: '血',
      pinyin: 'xue4',
      meanings: ['máu', 'khẩu ngữ đọc là [xie3]'],
    });
  });

  it('filters both a "Lượng từ:" annotation and a "Bộ Khang Hy số" radical annotation', () => {
    // Real CVDICT.u8 line for 衣 (packages/content/raw/CVDICT.u8:96373).
    const line = '衣 衣 [yi1] /quần áo/Lượng từ: 件[jian4]/Bộ Khang Hy số 145/';
    expect(parseCedictLine(line)).toEqual({
      traditional: '衣',
      simplified: '衣',
      pinyin: 'yi1',
      meanings: ['quần áo'],
    });
  });

  it('filters a lowercase "lượng từ:" annotation whose classifier list contains an internal comma', () => {
    // Real CVDICT.u8 line for 腳/脚 (packages/content/raw/CVDICT.u8:89226). The
    // "lượng từ: 雙|双[shuang1], 隻|只[zhi1]" sense has an internal ", " — this
    // must be dropped as one whole slash-delimited sense, not re-split on ", ".
    const line =
      '腳 脚 [jiao3] /bàn chân/chân (của động vật hoặc đồ vật)/đế, chân (của đồ vật)/lượng từ: 雙|双[shuang1], 隻|只[zhi1]/lượng từ cho cú đá/';
    expect(parseCedictLine(line)).toEqual({
      traditional: '腳',
      simplified: '脚',
      pinyin: 'jiao3',
      meanings: [
        'bàn chân',
        'chân (của động vật hoặc đồ vật)',
        'đế, chân (của đồ vật)',
        'lượng từ cho cú đá',
      ],
    });
  });

  it('keeps a spelled-out "lượng từ:" sense that is a genuine classifier-usage meaning (no bracketed citation)', () => {
    // Real CVDICT.u8 line for 對/对 (packages/content/raw/CVDICT.u8:33647).
    const line =
      '對 对 [dui4] /đúng; chính xác/hướng đến; tại; vì/về; liên quan đến/đối xử (với ai đó cách nào đó)/đối mặt/(dạng kết hợp) đối diện; đối nhau; phù hợp/ghép lại với nhau; điều chỉnh/phù hợp; thích hợp/trả lời; đáp/thêm vào; rót vào (chất lỏng)/kiểm tra; so sánh/lượng từ: cặp; đôi/';
    const result = parseCedictLine(line);
    expect(result?.meanings).toContain('lượng từ: cặp; đôi');
    expect(result?.meanings).toHaveLength(12);
  });

  it('keeps a genuine "lượng từ:" sense alongside a real metadata "lượng từ:" sense on the same line (把)', () => {
    // Real CVDICT.u8 line for 把 (packages/content/raw/CVDICT.u8:44618). The
    // classifier-list "lượng từ: nắm, bó, chùm" here has NO bracketed pinyin
    // citation, so it must be kept — unlike a metadata annotation.
    const line =
      '把 把 [ba3] /cầm; nắm/đỡ em bé để đi tiểu hoặc đại tiện/tay cầm/lượng từ: nắm, bó, chùm/lượng từ cho vật có cán/(dùng để đưa tân ngữ lên trước động từ: 把[ba3] + {danh từ} + {động từ})/';
    expect(parseCedictLine(line)).toEqual({
      traditional: '把',
      simplified: '把',
      pinyin: 'ba3',
      meanings: [
        'cầm; nắm',
        'đỡ em bé để đi tiểu hoặc đại tiện',
        'tay cầm',
        'lượng từ: nắm, bó, chùm',
        'lượng từ cho vật có cán',
        '(dùng để đưa tân ngữ lên trước động từ: 把[ba3] + {danh từ} + {động từ})',
      ],
    });
  });

  it('strips a metadata "LT:" sense while keeping a genuine capitalized "Lượng từ:" sense on the same line (級)', () => {
    // Real CVDICT.u8 line for 級/级 (packages/content/raw/CVDICT.u8:83432).
    const line = '級 级 [ji2] /cấp/hạng/bậc/bước (cầu thang)/LT:個|个[ge4]/Lượng từ: bước, cấp/';
    expect(parseCedictLine(line)).toEqual({
      traditional: '級',
      simplified: '级',
      pinyin: 'ji2',
      meanings: ['cấp', 'hạng', 'bậc', 'bước (cầu thang)', 'Lượng từ: bước, cấp'],
    });
  });

  it('keeps a genuine "lượng từ:" sense for 握 (một nắm)', () => {
    // Real CVDICT.u8 line for 握 (packages/content/raw/CVDICT.u8:47603).
    const line = '握 握 [wo4] /cầm; nắm/chặt (nắm đấm)/(dạng kết hợp) kiểm soát/lượng từ: một nắm/';
    expect(parseCedictLine(line)).toEqual({
      traditional: '握',
      simplified: '握',
      pinyin: 'wo4',
      meanings: ['cầm; nắm', 'chặt (nắm đấm)', '(dạng kết hợp) kiểm soát', 'lượng từ: một nắm'],
    });
  });

  it('keeps a genuine "lượng từ:" sense for 樣/样 (loại, kiểu)', () => {
    // Real CVDICT.u8 line for 樣/样 (packages/content/raw/CVDICT.u8:58264).
    const line = '樣 样 [yang4] /cách/thứ/phương thức/diện mạo/hình dạng/lượng từ: loại, kiểu/';
    expect(parseCedictLine(line)).toEqual({
      traditional: '樣',
      simplified: '样',
      pinyin: 'yang4',
      meanings: ['cách', 'thứ', 'phương thức', 'diện mạo', 'hình dạng', 'lượng từ: loại, kiểu'],
    });
  });

  it('strips an inline "(lượng từ: ...)" parenthetical mid-sentence, keeping the prose (山)', () => {
    // Real CVDICT.u8 line for 山 (packages/content/raw/CVDICT.u8:35090).
    const line =
      '山 山 [shan1] /núi; đồi (lượng từ: 座[zuo4])/(thông tục) bó rơm nhỏ cho tằm làm kén/';
    expect(parseCedictLine(line)).toEqual({
      traditional: '山',
      simplified: '山',
      pinyin: 'shan1',
      meanings: ['núi; đồi', '(thông tục) bó rơm nhỏ cho tằm làm kén'],
    });
  });

  it('strips an inline "(Lượng từ: ...)" parenthetical mid-sentence, keeping the prose (笑話/笑话)', () => {
    // Real CVDICT.u8 line for 笑話/笑话 (packages/content/raw/CVDICT.u8:81286).
    const line =
      '笑話 笑话 [xiao4 hua5] /trò đùa; chuyện cười (Lượng từ: 個|个[ge4])/chế nhạo; chế giễu/lố bịch; vô lý/';
    expect(parseCedictLine(line)).toEqual({
      traditional: '笑話',
      simplified: '笑话',
      pinyin: 'xiao4 hua5',
      meanings: ['trò đùa; chuyện cười', 'chế nhạo; chế giễu', 'lố bịch; vô lý'],
    });
  });

  it('strips an inline "(Lượng từ: ...)" parenthetical mid-sentence, keeping the prose (光)', () => {
    // Real CVDICT.u8 line for 光 (packages/content/raw/CVDICT.u8:10505).
    const line =
      '光 光 [guang1] /ánh sáng; tia (Lượng từ: 道[dao4])/sáng; bóng loáng/chỉ; chỉ mỗi/dùng hết; hoàn thành/để lộ (một phần cơ thể)/';
    expect(parseCedictLine(line)).toEqual({
      traditional: '光',
      simplified: '光',
      pinyin: 'guang1',
      meanings: [
        'ánh sáng; tia',
        'sáng; bóng loáng',
        'chỉ; chỉ mỗi',
        'dùng hết; hoàn thành',
        'để lộ (một phần cơ thể)',
      ],
    });
  });

  it('strips a whole metadata sense (LT:) and a Kangxi radical sense, keeping real senses (車/车)', () => {
    // Real CVDICT.u8 line for 車/车 [che1] (packages/content/raw/CVDICT.u8:103564).
    const line =
      '車 车 [che1] /xe/phương tiện giao thông/LT:輛|辆[liang4]/máy/mài giũa bằng máy tiện/bộ thủ Khang Hy số 159/';
    expect(parseCedictLine(line)).toEqual({
      traditional: '車',
      simplified: '车',
      pinyin: 'che1',
      meanings: ['xe', 'phương tiện giao thông', 'máy', 'mài giũa bằng máy tiện'],
    });
  });

  it('strips a Kangxi radical sense phrased with "thứ" instead of "số", keeping a real classifier-usage sense with no citation (文)', () => {
    // Real CVDICT.u8 line for 文 [wen2] (packages/content/raw/CVDICT.u8:50406). The
    // "(cổ) lượng từ cho tiền" sense has no bracketed citation and must be kept.
    const line =
      '文 文 [wen2] /ngôn ngữ/văn hóa/chữ viết/trang trọng/văn học/nhẹ nhàng/(cổ) lượng từ cho tiền/bộ thủ Khang Hy thứ 67/';
    expect(parseCedictLine(line)).toEqual({
      traditional: '文',
      simplified: '文',
      pinyin: 'wen2',
      meanings: [
        'ngôn ngữ',
        'văn hóa',
        'chữ viết',
        'trang trọng',
        'văn học',
        'nhẹ nhàng',
        '(cổ) lượng từ cho tiền',
      ],
    });
  });
});

describe('parseCedict', () => {
  it('parses multiple lines, skipping comments', () => {
    const text = [
      '# header comment',
      '你好 你好 [ni3 hao3] /xin chào/chào/',
      '謝謝 谢谢 [xie4 xie5] /cảm ơn/cảm ơn bạn/',
    ].join('\n');
    const out = parseCedict(text);
    expect(out).toHaveLength(2);
    expect(out[0]!.simplified).toBe('你好');
    expect(out[1]!.meanings).toEqual(['cảm ơn', 'cảm ơn bạn']);
  });
});

describe('normalizeCedictPinyin', () => {
  it('converts CEDICT u: convention to ü', () => {
    expect(normalizeCedictPinyin('nu:3')).toBe('nü3');
    expect(normalizeCedictPinyin('lu:4 mao4 zi5')).toBe('lü4 mao4 zi5');
  });

  it('leaves non-ü pinyin unchanged', () => {
    expect(normalizeCedictPinyin('qu4')).toBe('qu4');
  });
});

describe('pinyinSyllableToNumeric', () => {
  it('converts each tone-marked vowel to its numeric form', () => {
    expect(pinyinSyllableToNumeric('nǐ')).toBe('ni3');
    expect(pinyinSyllableToNumeric('hǎo')).toBe('hao3');
    expect(pinyinSyllableToNumeric('mā')).toBe('ma1');
  });

  it('converts precomposed ü-tone vowels, keeping ü', () => {
    expect(pinyinSyllableToNumeric('nǚ')).toBe('nü3');
    expect(pinyinSyllableToNumeric('lǜ')).toBe('lü4');
  });

  it('defaults to neutral tone 5 when there is no diacritic', () => {
    expect(pinyinSyllableToNumeric('ma')).toBe('ma5');
    expect(pinyinSyllableToNumeric('zi')).toBe('zi5');
  });
});

describe('pinyinToNumeric', () => {
  it('converts a full multi-syllable pinyin string', () => {
    expect(pinyinToNumeric('nǐ hǎo')).toBe('ni3 hao3');
    expect(pinyinToNumeric('lǜ')).toBe('lü4');
  });
});
