# Liên tưởng chữ đơn ↔ từ ghép — Design

Date: 2026-09-25
Status: draft

## 1. Vấn đề

Đo trên output hiện tại (main `52c2953`):

- Khoá có 542 từ một chữ (L1 212, L2 176, L3 154), nhiều hư từ/phó từ/lượng
  từ (d 67, q 92, p 27…). Slide `word-intro` chỉ hiện chữ, pinyin, Hán Việt và
  3 nghĩa đầu. Đứng riêng, chữ như 太 gần như vô nghĩa với người học.
- Thứ tự nghĩa lấy từ CVDICT, không theo cách khoá dùng. 太 hiện "cao nhất, vĩ
  đại, quá (nhiều)" — nghĩa khoá dạy (太…了 "quá") đứng thứ 3, "rất" thứ 4 và
  không hiện. 很 mở đầu bằng nhãn "(phó từ mức độ)".
- Không có gì nối chữ đơn với từ ghép chứa nó: 太 (l1-u03) và 太阳 Thái Dương
  (l2-u28) không liên hệ nhau trên màn hình, dù Hán Việt là cầu nối mạnh nhất
  với người Việt.
- Khi dạy từ ghép, người học không thấy từng chữ đóng góp nghĩa gì.

## 2. Mục tiêu

1. Mỗi từ một chữ có 2–3 **từ ghép minh hoạ** (liên tưởng) hiện ngay trên slide
   dạy từ: chữ, pinyin, Hán Việt, nghĩa ngắn, bấm để nghe.
2. Mỗi từ nhiều chữ hiện **phần tách chữ** trên slide dạy từ: từng chữ + Hán
   Việt + nghĩa gốc ngắn, đánh dấu chữ nào đã học ở unit trước.
3. Nghĩa đầu tiên của mỗi từ một chữ là nghĩa khoá thực sự dùng; không mở đầu
   bằng nhãn ngữ pháp khi có nghĩa thực.
4. CharacterPage hiện nghĩa gốc ngắn và danh sách liên tưởng.
5. Liên tưởng **không phải từ phải học**: không sinh bài tập, không vào FSRS,
   không tính vào guard coverage/lesson, không đổi unit/câu/grammar.

### Ngoài phạm vi

- Thêm từ vựng mới vào khoá, đổi unit, câu, grammar.
- Bài tập dựa trên liên tưởng.
- Điều hướng từ slide sang CharacterPage (rời bài học sẽ mất tiến độ bài).
- Nghĩa của từ nhiều chữ (chỉ sửa thứ tự nghĩa của từ một chữ).

## 3. Dữ liệu authored

### 3.1 Liên tưởng — `authored/associations/level{1,2,3}.json`

Theo level của từ một chữ. Key = chữ.

```json
{
  "太": [
    { "zh": "太阳", "vi": "mặt trời" },
    { "zh": "太平洋", "vi": "Thái Bình Dương", "pinyin": "tài píng yáng" },
    { "zh": "太太", "vi": "bà xã; phu nhân" }
  ]
}
```

- `zh`, `vi` bắt buộc. `vi` là nghĩa ngắn chọn cho liên tưởng (không phải cả
  danh sách nghĩa).
- Từ **trong khoá** (khớp `Word.simplified`): pipeline lấy pinyin, Hán Việt,
  `wordId` từ Word; `pinyin`/`hanViet` trong file bị cấm (tránh lệch).
- Từ **ngoài khoá**: pinyin lấy từ CVDICT; bắt buộc ghi `pinyin` khi CVDICT có
  nhiều cách đọc. Hán Việt ghép từ char-map; bắt buộc ghi `hanViet` khi có chữ
  ngoài char-map (899 chữ khoá).
- Tiêu chí chọn (cho người viết + reviewer): ưu tiên từ trong khoá; thêm từ
  ngoài khoá khi nó gợi nhớ rõ hơn, nhất là từ có Hán Việt quen trong tiếng Việt
  (Thái Dương, Thái Bình Dương, Điện Thoại…); từ thông dụng, không thành ngữ
  hiếm; chữ phải đọc **cùng âm tiết** như từ đang dạy (không dùng 长 zhǎng cho
  长 cháng); ít nhất một liên tưởng làm rõ nghĩa của chữ.

### 3.2 Nghĩa gốc của chữ — `authored/char-glosses.json`

Một nghĩa gốc ngắn (≤ 4 từ tiếng Việt, có thể có "; ") cho **cả 899 chữ khoá**,
dùng trong phần tách chữ và CharacterPage: 太 "to lớn; quá", 阳 "mặt trời;
dương", 话 "lời nói". Là nghĩa giúp giải thích từ ghép, không nhất thiết là
nghĩa khi chữ đứng riêng. Giữ `CharacterData.definition` (dài, từ CVDICT) như cũ.

### 3.3 Thứ tự nghĩa của từ một chữ — sửa `authored/meanings/level{1,2,3}.json`

Với 542 từ một chữ: đưa nghĩa khoá dùng (theo câu/grammar của khoá) lên đầu;
bỏ nhãn đứng đầu kiểu "(phó từ mức độ)" khi đã có nghĩa thực (hư từ thuần như
的/了 giữ mô tả chức năng). Chỉ đổi thứ tự/lọc bớt, không bịa nghĩa mới; thêm
nghĩa chỉ khi nghĩa khoá dùng bị thiếu hẳn (vd 只 lượng từ — kiểm tra lại).

## 4. Pipeline

- `fetch`: thêm CVDICT (nguồn đã pin ở `CVDICT_SOURCE`) vào nguồn raw của build,
  cache trong `raw/` như các file khác.
- `pipeline/associations.ts` (hàm thuần): `resolveAssociations(authored, words,
  cvdict, hanViet)` → `Map<char, Association[]>` + lỗi.
- Output type mới:

  ```ts
  interface Association { zh: string; pinyin: string; hanViet: string; vi: string; wordId?: string }
  interface WordPart { char: string; hanViet: string; gloss: string; wordId?: string }
  // Word thêm:
  associations?: Association[]; // chỉ từ một chữ
  parts?: WordPart[];           // chỉ từ nhiều chữ
  // CharacterData thêm:
  gloss: string;
  associations: Association[];  // của từ một chữ trùng chữ này, [] nếu không có
  ```

  `WordPart.wordId` = từ một chữ của khoá cùng chữ đó (nếu có), để web biết "đã
  học". `parts` tính từ `Word.characters` + char-glosses + char-map.
- Kích thước: words.json 765 KB → ước ~1.05 MB (≈130 KB liên tưởng + ≈170 KB
  parts). Chấp nhận; không thêm file mới để không đổi loader/cache.

### Validate (hard-fail, trong `validateContent`)

- `association-coverage`: mọi từ một chữ có 2–3 liên tưởng.
- `association-contains`: `zh` chứa chữ đó, dài ≥ 2 chữ, không trùng chính từ.
- `association-reading`: âm tiết của chữ trong pinyin liên tưởng trùng âm tiết
  của từ đang dạy (so không dấu thanh — cho phép thanh nhẹ/biến điệu như 太太).
- `association-source`: từ ngoài khoá phải có trong CVDICT với pinyin khớp;
  từ trong khoá không được ghi `pinyin`/`hanViet`.
- `association-hanviet`: Hán Việt đầy đủ (không fallback).
- `char-gloss`: đủ 899 chữ, không rỗng, ≤ 4 từ mỗi vế.

### Data test

- Test quét thẳng file authored (giống `vietnamese-data.test.ts`): không có nhãn
  ngữ pháp đứng đầu ở từ một chữ có nghĩa thực (danh sách hư từ được miễn ghi
  rõ trong test), không có leak metadata CVDICT trong `vi`/gloss.

## 5. Web

- `WordIntroSlide`:
  - Từ một chữ: dưới phần nghĩa, khối "Gặp trong" liệt kê liên tưởng: `太阳`
    to, pinyin, Hán Việt nghiêng, nghĩa; mỗi dòng có nút nghe (SpeakButton).
    Từ trong khoá ở unit đã qua có dấu "đã học".
  - Từ nhiều chữ: khối tách chữ, mỗi chữ một ô: chữ, Hán Việt, gloss; ô có
    `wordId` thuộc unit đứng trước unit hiện tại mang dấu "đã học".
  - Layout gọn trên màn hình điện thoại (375 px) không cần cuộn ngang; khối phụ
    dùng chữ nhỏ hơn nghĩa chính.
- `CharacterPage`: hiện `gloss` dưới Hán Việt, khối "Liên tưởng" trước danh sách
  từ khoá chứa chữ.
- "Đã học" tính từ `Unit.order` trong manifest (unit của `wordId` < unit hiện
  tại), không phụ thuộc tiến độ người dùng.
- Không đổi `slides.ts`, bài tập, FSRS, sync.

## 6. Quy trình viết nội dung

- Theo batch (~60–80 chữ), subagent viết liên tưởng + gloss + sửa thứ tự nghĩa,
  có trong tay: nghĩa hiện tại, các câu/grammar của khoá dùng chữ đó, danh sách
  từ khoá chứa chữ, char-map Hán Việt.
- Mỗi batch qua build (validate) + review nội dung riêng (đúng nghĩa, Hán Việt,
  âm tiết, tính gợi nhớ) trước khi commit.
- Danh sách native review: `2026-09-25-char-associations-native-review.md`
  (liên tưởng ngoài khoá, Hán Việt tự ghi, gloss khó).

## 7. Tiêu chí hoàn thành

- Build 0 lỗi, 0 cảnh báo; mọi test cũ + mới pass.
- 542/542 từ một chữ có 2–3 liên tưởng; 899/899 chữ có gloss.
- Slide dạy 太, 很, 个, 太阳, 电话 hiện đúng (kiểm tra bằng component test + chạy
  thử app ở viewport điện thoại).
- Unit/câu/grammar byte-identical so với trước (chỉ words.json, characters/*,
  manifest đổi).
- Native review trước khi deploy ra ngoài (quy tắc như các phase trước).
