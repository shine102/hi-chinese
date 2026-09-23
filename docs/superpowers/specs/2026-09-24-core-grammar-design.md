# Bổ sung ngữ pháp cốt lõi L1 + L2 — Design

Date: 2026-09-24
Status: draft

## 1. Mục tiêu và phạm vi

Audit curriculum (2026-09-24) cho thấy khóa HSK1-3 thiếu hẳn nhiều mẫu ngữ pháp
nền: 了 (hoàn thành / thay đổi trạng thái), 着, 的 sở hữu, 个 lượng từ, 得 bổ ngữ
mức độ, 是…的, 会, 可以, câu hỏi chính phản, 还是… Đồng thời 了/过/着 bị dạy ở unit
cuối L1 (`l1-u42`), nên chỉ 28/332 câu L1 dùng được 了.

Mục tiêu: sau khi học xong L1 + L2, người học đã gặp đủ các mẫu ngữ pháp nền,
mỗi mẫu xuất hiện ngay ở unit mà nó cần, có câu ví dụ và bài tập đi kèm.

### Trong phạm vi

- 13 điểm ngữ pháp mới L1, 6 điểm mới L2, chuyển `g:jianguo-experience-marker` L2 → L1.
- Chuyển 4 từ lên sớm: 了, 着, 过 (L1), 更 (L2).
- Cơ chế `anchor` trong pipeline để điểm ngữ pháp được đặt vào đúng unit chỉ định.
- ~70-80 câu ví dụ mới.

### Ngoài phạm vi

- Sửa placement L2/L3 nói chung (cap/spill dồn ngữ pháp về cuối level) — phần 2 của audit.
- Thêm câu cho 45 unit không có câu — phần 3.
- Chia lại theme L2/L3 — phần 4.
- Migrate tiến độ học đã lưu (`unit_progress.completed_lessons`): user chấp nhận lệch
  cho các unit bị đổi từ.

## 2. Cơ chế anchor

### Vấn đề

- L1 dùng `placeAuthoredGrammar`: đặt grammar ở unit của câu ví dụ **sớm nhất**.
- L2/L3 dùng `placeGrammar`: unit của câu **muộn nhất**, cap 4/unit, spill về sau.
  Thêm điểm L2 mới mà không đổi gì thì dễ bị spill về cuối level.
- App chỉ load câu của unit hiện tại (`units/<id>.json`), nên grammar đặt ở unit
  không chứa câu ví dụ của nó thì slide giới thiệu không có ví dụ và không sinh
  được bài điền chỗ trống (hiện 94/273 điểm bị vậy).

### Thiết kế

- `AuthoredGrammar.anchor?: string` — chữ giản thể của một từ trong khóa.
  Grammar được đặt vào unit của từ đó (`word.unitId`). Anchor là "từ quyết định
  vị trí", không bắt buộc là chính từ ngữ pháp (vd `le-completed` neo vào 看 để
  nằm ở `l1-u18`). Neo theo từ, không theo unit id, để grammar đi theo từ khi
  unit bị sắp lại.
- Hàm mới `placeAnchoredGrammar(authored, sentences, units, words)` trong
  `pipeline/placement.ts`. Lỗi (`PlacementError.kind` mở rộng):
  - `anchor-unknown`: anchor không phải từ trong khóa.
  - `level-mismatch`: level của unit neo ≠ `g.level`.
  - `anchor-examples`: ít hơn **2** câu ví dụ có `unitId` = unit neo.
  - `missing-sentence`, `duplicate-id`: như các placer hiện có.
  - Câu ví dụ nằm ở unit khác vẫn được phép (không lỗi), miễn đủ 2 câu trong unit neo.
- Hệ quả khi viết câu: câu được đặt ở unit của từ muộn nhất trong câu, nên mỗi
  điểm neo cần ít nhất 2 câu chứa một từ thuộc unit neo và chỉ dùng từ đã học
  trước đó.
- `pipeline/run.ts` định tuyến 3 nhánh:
  - có `anchor` (mọi level) → `placeAnchoredGrammar`;
  - L1 không anchor → `placeAuthoredGrammar` (giữ nguyên);
  - L2/L3 không anchor → `placeGrammar(…, 4)` (giữ nguyên).
  - Grammar có anchor **không** tính vào cap 4/unit của `placeGrammar` (ghi chú
    bằng comment trong `run.ts`).
- Output schema (`GrammarPoint`) không đổi → app web không phải sửa.

## 3. Chuyển từ

| Từ | Từ → Đến | Lý do |
|---|---|---|
| 了 | `l1-u42` → `l1-u16` Ăn & Uống | 饿了/渴了/吃了 |
| 着 | `l1-u42` → `l1-u19` Hoạt động hằng ngày | 穿着/站着/放着 |
| 过 | `l1-u42` → `l1-u27` Du lịch | 你去过中国吗 |
| 更 | `l2-u46` → `l2-u36` Miêu tả 1 | gần phần so sánh |

- Sửa trong `authored/units/level{1,2}.json`. Trong unit đích, chữ đơn chèn ngay
  trước từ ghép đầu tiên dùng nó (nếu có), nếu không thì cuối unit.
- Chỉ chuyển chữ đơn lên sớm → luật chữ-đơn-trước-từ-ghép (`curriculum-order.ts`)
  không bị vi phạm; build vẫn phải báo 0 violation.
- `l1-u42` còn 5 từ (图书馆 打球 开会 开玩笑 找到) — giữ, không gộp.
- Câu hiện có chứa 了/过/着 sẽ tự dời unit sớm hơn (unit câu = từ muộn nhất), kéo
  theo placement earliest của vài grammar L1 hiện có (vd `g:tai-le`). Chấp nhận;
  validator là lưới an toàn.

## 4. Điểm ngữ pháp mới

Id có tiền tố `g:`. Unit đích là kết quả kỳ vọng của anchor sau khi chuyển từ.

### L1 (`authored/grammar/level1.json`)

| id | Mẫu | anchor | Unit |
|---|---|---|---|
| `g:de-possessive` | 我的 + N; bỏ 的 với người thân (我妈妈) | 的 | `l1-u04` |
| `g:ye-dou` | S + 也/都 + V (vị trí phó từ) | 们 | `l1-u07` |
| `g:ge-measure` | số / 这 / 那 + 个 + N | 这 | `l1-u09` |
| `g:he-noun` | N 和 N (chỉ nối danh từ) | 今天 | `l1-u11` |
| `g:a-not-a` | V不V / 有没有 / 是不是 | 时间 | `l1-u13` |
| `g:le-change` | … 了 cuối câu: thay đổi trạng thái (饿了, 十岁了) | 了 | `l1-u16` |
| `g:le-completed` | V了 (+O); hỏi …了吗; phủ định 没 + V (không có 了) | 看 | `l1-u18` |
| `g:xiang-want` | 想 + V; so với 要 | 想 | `l1-u18` |
| `g:zhe-durative` | V着 (trạng thái kéo dài) | 着 | `l1-u19` |
| `g:cong-dao` | 从 A 到 B (nơi chốn / thời gian) | 从 | `l1-u25` |
| `g:jianguo-experience-marker` | V过 (đã từng) — **chuyển từ L2**, `level: 1` | 过 | `l1-u27` |
| `g:lai-qu-direction` | V + 来/去 (回来, 出去, 进来) | 回来 | `l1-u28` |
| `g:hui-can` | 会 + V (biết làm; sẽ/có khả năng) | 汉语 | `l1-u32` |
| `g:haishi-choice` | A 还是 B? (câu hỏi lựa chọn) | 还是 | `l1-u40` |

`g:jianguo-experience-marker` giữ id cũ, xóa khỏi `grammar/level2.json`, viết
lại `examples` bằng câu L1 mới. Các câu ví dụ cũ của nó vẫn giữ trong
`sentences/level2.json` (chúng vẫn là câu hợp lệ của unit L2).

`l1-u18` sẽ có 7 điểm ngữ pháp — chấp nhận (unit động từ chính, 41 câu).

### L2 (`authored/grammar/level2.json`)

| id | Mẫu | anchor | Unit |
|---|---|---|---|
| `g:keyi-permission` | 可以 + V (được phép / có thể) | 可以 | `l2-u01` |
| `g:de-degree` | V得 + (很) adj (说得很好); V + O + V得… | 得 | `l2-u01` |
| `g:yi-jiu` | 一 A 就 B | 哭 | `l2-u05` |
| `g:shi-de` | 是 … 的 nhấn người làm / thời gian / cách thức | 带来 | `l2-u10` |
| `g:bi-extended` | A 比 B 更 adj; A 没有 B (那么) adj | 更 | `l2-u36` |
| `g:jiu-cai` | 就 (sớm/dễ) vs 才 (muộn/khó) | 才 | `l2-u46` |

## 5. Nội dung

- Mỗi điểm: `title` + `pattern` + `explanation` tiếng Việt, 2-4 câu, có ví dụ
  ngắn inline, cùng giọng văn các điểm hiện có (vd `g:bu-negation`).
- Mỗi điểm 3-4 câu ví dụ, ≥2 câu nằm trong unit neo. Tổng ~70-80 câu mới trong
  `authored/sentences/level{1,2}.json`, id nối tiếp dãy hiện tại (`s:l1:NNN`, `s:l2:NNN`).
- Mỗi câu: `zh`, `pinyin` (có dấu, áp dụng biến điệu 不/一 như các câu hiện có),
  `vi`, `words` (token phải ghép đúng `zh` và đều là từ trong khóa — `placeSentences`
  kiểm tra).
- Câu ưu tiên tự nhiên, ngắn, chủ yếu dùng từ đã học, làm nổi bật đúng mẫu.
- Toàn bộ nội dung mới do AI viết → **cần người bản ngữ review trước khi deploy
  ra ngoài** (theo quy định; merge local thì được).

## 6. Kiểm tra

- Unit test `placeAnchoredGrammar`: happy path + mỗi loại lỗi
  (`anchor-unknown`, `level-mismatch`, `anchor-examples`, `missing-sentence`,
  `duplicate-id`); grammar có anchor không chiếm cap của `placeGrammar`.
- Data test mới `core-grammar-data.test.ts` (đọc output shipped như
  `curriculum-order-data.test.ts`): 20 id (19 mới + `g:jianguo-experience-marker`) tồn tại, nằm đúng unit trong bảng
  mục 4, mỗi id có ≥2 câu ví dụ trong unit của nó.
- Build content: 0 lỗi placement/validate, 0 curriculum-order violation.
- Test suite content / web / worker đều pass.
- Kiểm tra thủ công trên app: mở `l1-u16` → slide grammar 了 có câu ví dụ và bài
  điền chỗ trống.

## 7. Rủi ro

- **Placement L1 hiện có bị xê dịch** do 了/过/着 dời lên sớm → có thể phát sinh lỗi
  `level-mismatch`/`sentence-order`; xử lý bằng cách chỉnh câu hoặc từ liên quan
  khi build báo lỗi.
- **Tiến độ đã lưu lệch** ở các unit `l1-u16`, `l1-u19`, `l1-u27`, `l1-u42`,
  `l2-u36`, `l2-u46` — đã chấp nhận.
- **Chất lượng nội dung** — review bởi người bản ngữ trước khi deploy.
