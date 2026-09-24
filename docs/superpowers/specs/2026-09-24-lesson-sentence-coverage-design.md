# Câu cho mọi lesson — Design

Date: 2026-09-24
Status: draft
Tiếp nối: `2026-09-24-l2-l3-grammar-placement-design.md` (phần 2 của audit curriculum).

## 1. Mục tiêu và phạm vi

App chia mỗi unit thành lesson 4 từ (`apps/web/src/lessons/compute.ts`,
`CHUNK_SIZE = 4`). Một câu thuộc lesson chứa từ mới **muộn nhất** của nó trong
unit. Bài xếp câu (sentence-builder) chỉ lấy câu của chính lesson, nên lesson
không có câu thì chỉ còn trắc nghiệm từ và ghép cặp.

Đo trên output hiện tại (sau phần 2):

| Level | Lesson | Lesson 0 câu | Unit 0 câu |
|---|---|---|---|
| L1 | 140 | 35 | 0 |
| L2 | 206 | 111 | 12 |
| L3 | 263 | 174 | 30 |

Mục tiêu: **mọi lesson của mọi unit có ≥1 câu**. Khoảng 320 câu mới.

### Trong phạm vi

- Viết câu mới cho mọi lesson đang có 0 câu (L1, L2, L3).
- Script `lesson-gaps` liệt kê lesson trống và từ được phép dùng.
- Data guard trong `apps/web`: mọi lesson có ≥1 câu.

### Ngoài phạm vi

- Nâng lesson đang có 1 câu lên 2.
- Độ phủ theo từ (mỗi từ xuất hiện trong ≥1 câu).
- Thêm câu mới vào `examples` của điểm ngữ pháp; placement / dồn ngữ pháp giữ
  nguyên (phần 4).
- Chuẩn hóa pinyin câu cũ; đổi thứ tự hay nội dung unit.

## 2. Quy tắc viết câu

Câu cho lesson `k` của unit `U`:

1. Chứa ≥1 từ mới của lesson `k`; ưu tiên từ của lesson `k` chưa xuất hiện
   trong câu nào của unit.
2. Chỉ dùng từ đã học tới đó: mọi từ của các unit trước (mọi level trước và các
   unit trước trong cùng level) + từ của lesson `0..k` trong `U`. Dùng từ của
   lesson sau hoặc unit sau thì câu tự dời chỗ và lesson `k` vẫn trống.
3. Mọi token trong `words` là từ trong khóa và ghép lại đúng `zh` (bỏ dấu câu)
   — `placeSentences` đã kiểm tra.
4. Ngắn (thường 4-10 chữ ở L1, ≤15 chữ ở L2/L3), tự nhiên, hợp chủ đề unit.
5. `pinyin` có dấu, tách theo từ, biến điệu 不/一 như các câu phần 1; viết hoa
   chữ đầu câu và tên riêng.
6. `vi` tự nhiên, không dịch word-by-word.
7. Id: `s:l1:fill:NNN`, `s:l2:fill:NNN`, `s:l3:fill:NNN` (3 chữ số, liên tục
   từ 001), thêm vào cuối `authored/sentences/level{1,2,3}.json` theo level
   của unit.
8. Một lesson trống cần đúng 1 câu là đủ; viết thêm cho lesson đó là không cần
   (không cấm).

## 3. Script `lesson-gaps`

`packages/content/scripts/lesson-gaps.ts`, chạy `pnpm --filter @hi-chinese/content
lesson-gaps --level <1|2|3> [--units l2-u07,l2-u08]`:

- Đọc output đã build (`apps/web/public/content/manifest.json`, `units/*.json`,
  `words.json`).
- Chia lesson giống `computeLessons` (4 từ, câu vào lesson của từ muộn nhất).
- Với mỗi lesson có 0 câu, in: unit id + title, số lesson, từ mới của lesson
  (chữ, pinyin, nghĩa tiếng Việt), từ của lesson trước trong unit, và "được phép
  dùng" = toàn bộ từ đã học tới lesson đó (in gọn, một dòng).
- Cuối cùng in tổng số lesson trống theo level.
- Chỉ là công cụ viết nội dung, không nằm trong build hay test.

Logic chia lesson được chép (4 từ) vào script — chấp nhận vì script không phải
nguồn chân lý; guard ở mục 4 dùng `computeLessons` thật.

## 4. Data guard

`apps/web/test/content/lesson-coverage-data.test.ts`:

- Đọc `apps/web/public/content` (manifest + mọi `units/*.json`).
- Với mỗi unit: `computeLessons(unit, grammar, sentences)`; mỗi lesson phải có
  `sentenceIds.length >= 1`.
- Thông báo lỗi liệt kê `unitId#lessonIndex` của lesson trống.
- Content đã build được commit (`git add -f`), nên test đọc thẳng file và fail
  nếu thiếu — không skip.

## 5. Chia lô

Mỗi lô là một task: chạy `lesson-gaps` cho các unit của lô, viết câu, build
content, xác nhận lesson của lô hết trống. Reviewer mỗi lô kiểm tra tự nhiên,
đúng mẫu, đúng từ vựng, pinyin/vi.

| Task | Phạm vi | Lesson trống (đo 2026-09-24) |
|---|---|---|
| 1 | Script `lesson-gaps` | — |
| 2 | L1 | 35 |
| 3 | L2 u01-u25 | 51 |
| 4 | L2 u26-u64 | 60 |
| 5 | L3 u01-u29 | 55 |
| 6 | L3 u30-u52 | 58 |
| 7 | L3 u53-u78 + data guard | 61 |

Mỗi task nội dung tự kiểm bằng `lesson-gaps` (0 lesson trống trong phạm vi của
nó). Guard (mục 4) được thêm ở task cuối, khi mọi lesson đã có câu — thêm sớm
hơn thì test đỏ suốt các task giữa.

## 6. Kiểm tra

- Build content: 0 lỗi placement/validate, 0 curriculum-order violation; cảnh
  báo dồn ngữ pháp không tăng (không đổi `examples`).
- `lesson-gaps` cả 3 level: 0 lesson trống.
- Guard `lesson-coverage-data.test.ts` pass.
- `core-grammar-data.test.ts` và các test content / web / worker khác pass.

## 7. Ảnh hưởng và rủi ro

- Unit, từ, ngữ pháp không đổi → tiến độ đã lưu không lệch.
- Câu mới vào đúng lesson của nó; lesson đã có câu không mất câu.
- Nội dung do AI viết → **cần người bản ngữ review trước khi deploy**. Khối
  lượng ~320 câu; mỗi lô có reviewer AI trước, nhưng không thay được review bản
  ngữ.
- Từ HSK3 khó đặt câu tự nhiên chỉ với từ đã học (từ trừu tượng ở unit sớm) →
  cho phép câu rất ngắn (cụm 2-3 từ + chủ ngữ) miễn tự nhiên.
