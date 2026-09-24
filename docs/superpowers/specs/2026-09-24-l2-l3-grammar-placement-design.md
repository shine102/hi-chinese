# Xếp ngữ pháp L2/L3 theo mật độ ví dụ — Design

Date: 2026-09-24
Status: draft
Tiếp nối: `2026-09-24-core-grammar-design.md` (phần 1 của audit curriculum).

## 1. Mục tiêu và phạm vi

Audit 2026-09-24 (đo lại sau phần 1): trong 205 điểm ngữ pháp L2/L3, **92 điểm
không có câu ví dụ nào trong unit của nó** (L2 45, L3 47) và 48 điểm chỉ có 1.
App chỉ load câu của unit hiện tại, nên với các điểm này slide ngữ pháp không có
ví dụ và không sinh được bài điền chỗ trống.

Nguyên nhân: `placeGrammar` đặt điểm ở unit của câu ví dụ **muộn nhất**, cap
4/unit, dư thì đẩy (spill) sang unit sau → ngữ pháp dồn cuối level vào unit
không chứa ví dụ; điểm có ví dụ chỉ dùng từ level thấp hơn bị kéo về unit đầu
level.

Mục tiêu: **mọi** điểm ngữ pháp L2/L3 nằm ở unit có ≥2 câu ví dụ của chính nó.

### Trong phạm vi

- Placer mới `placeGrammarByDensity` thay `placeGrammar` cho L2/L3 không có anchor.
- Xóa 2 điểm L3 trùng với core L2: `g:yi-jiu-assoonas`, `g:meiyou-comparison`.
- Viết thêm câu cho 26 điểm hiện không có unit nào đủ 2 ví dụ.
- Cảnh báo (không fail) khi unit có > 5 điểm ngữ pháp.
- Data guard: mọi điểm L2/L3 có ≥2 ví dụ trong unit của nó.

### Ngoài phạm vi

- L1: giữ `placeAuthoredGrammar` (earliest).
- Giảm dồn ngữ pháp ở các unit "Liên Từ & Cấu Trúc Câu" / "Thời Gian" (tối đa 8
  điểm/unit sau thay đổi) — để phần 4 (chia lại theme) xử lý. Đã thử soft-cap
  với unit dự phòng: gần như không giảm được vì hầu hết điểm chỉ có đúng 1 unit
  đủ 2 ví dụ.
- Viết câu cho unit không có câu (phần 3), chia lại theme (phần 4).

## 2. Placer mới

`placeGrammarByDensity(authored, sentences, units, minInUnit = 2)` trong
`pipeline/placement.ts`:

- Với mỗi điểm: đếm số câu ví dụ theo unit, **chỉ tính unit có `level` = `g.level`**.
- Chọn unit có số ví dụ lớn nhất; hòa thì unit có `order` nhỏ hơn (sớm hơn).
- Lỗi (`PlacementError.kind`):
  - `density-examples`: unit tốt nhất có < `minInUnit` ví dụ (kể cả khi không có
    ví dụ cùng level nào).
  - `missing-sentence`, `duplicate-id`: như các placer khác.
- Không cap, không spill.

`pipeline/run.ts`: nhánh "L2/L3 không anchor" gọi `placeGrammarByDensity` thay
`placeGrammar(…, 4)`. Cập nhật comment giải thích (bỏ đoạn về cap 4). Nếu
`placeGrammar` không còn nơi dùng → xóa hàm và test của nó.

Cảnh báo dồn: `build.ts` in cảnh báo non-blocking cho mỗi unit có > 5 điểm ngữ
pháp (cùng kiểu với cảnh báo curriculum-order). Ngưỡng là hằng số trong code.

## 3. Nội dung

### Xóa (trùng core L2)

- `g:yi-jiu-assoonas` (L3) — trùng `g:yi-jiu` (L2).
- `g:meiyou-comparison` (L3) — trùng phần "A 没有 B (那么) adj" của `g:bi-extended` (L2).
- Xóa khỏi `authored/grammar/level3.json`; câu ví dụ của chúng giữ nguyên trong
  `authored/sentences/level3.json`.

### 26 điểm cần thêm câu

Unit hiện có ví dụ cùng level (đo trước thay đổi):

| id | level | Unit hiện có ví dụ |
|---|---|---|
| `g:yiwai-apart-from` | 2 | l2-u04, l2-u16, l2-u22, l2-u24 (mỗi unit 1) |
| `g:potential-complement-liao` | 3 | — |
| `g:jiao-rang-passive` | 3 | — |
| `g:v-qilai-inchoative` | 3 | — |
| `g:yibian-yibian` | 3 | — |
| `g:you-you-both` | 3 | — |
| `g:de-relative-clause` | 3 | — |
| `g:v-kai-resultative` | 3 | l3-u01 |
| `g:potential-complement-xia` | 3 | l3-u08 |
| `g:v-zhu-resultative` | 3 | l3-u14 |
| `g:yue-yue-parallel` | 3 | l3-u25 |
| `g:suo-nominalizer` | 3 | l3-u01, l3-u08, l3-u32 |
| `g:you-agent` | 3 | l3-u01, l3-u26, l3-u32 |
| `g:zaocheng-result-in` | 3 | l3-u14, l3-u16, l3-u38 |
| `g:jianzhi-simply` | 3 | l3-u10, l3-u39, l3-u50 |
| `g:fanzheng-anyway` | 3 | l3-u03, l3-u10, l3-u54 |
| `g:jianjue-resolutely` | 3 | l3-u41, l3-u42, l3-u54 |
| `g:v-chu-resultative` | 3 | l3-u35, l3-u55 |
| `g:gengjia-even-more` | 3 | l3-u09, l3-u43, l3-u57 |
| `g:jiao-comparative` | 3 | l3-u08, l3-u14, l3-u58 |
| `g:yifangmian-lingyifangmian` | 3 | l3-u04, l3-u39, l3-u58 |
| `g:shouxian-qici-zuihou` | 3 | l3-u25, l3-u39, l3-u64 |
| `g:v-huai-resultative` | 3 | l3-u01, l3-u70 |
| `g:jin-only` | 3 | l3-u03, l3-u64, l3-u74 |
| `g:yinci-therefore` | 3 | l3-u02, l3-u25, l3-u74 |
| `g:dayue-approximately` | 3 | l3-u10, l3-u32, l3-u74 |

Quy tắc chọn unit đích cho mỗi điểm:

1. Nếu từ khóa của mẫu là một từ cùng level trong khóa (简直, 反正, 坚决, 更加, 较,
   仅, 因此, 大约, 首先, 一方面, 造成, 由, 所…) → unit dạy từ đó.
2. Nếu không (mẫu chỉ dùng từ level thấp: 一边…一边, 又…又, 的 định ngữ, V起来,
   叫/让 bị động, V得/不了, V开/住/坏/出…) → unit sớm nhất đã có 1 ví dụ cùng
   level; nếu chưa có ví dụ nào → một unit L3 sớm, hợp chủ đề, **không** thuộc
   l3-u01..u04 (đã dồn nhiều).
3. Thêm câu mới (id `s:l3:fix:NNN`, `s:l2:fix:NNN`) sao cho unit đích có ≥2 ví
   dụ và **nhiều ví dụ hơn mọi unit cùng level khác** của điểm đó (để placer chọn
   đúng). Thêm id câu mới vào `examples` của điểm; không xóa ví dụ cũ.
4. Câu mới: chứa ≥1 từ của unit đích, còn lại chỉ dùng từ đã học tới unit đó;
   tự nhiên, ngắn, thể hiện đúng mẫu; pinyin có dấu + biến điệu 不/一 theo quy
   ước phần 1; `vi` tự nhiên.

Ước tính ~30-50 câu mới.

## 4. Kiểm tra

- Unit test `placeGrammarByDensity`: chọn unit dày nhất; hòa → unit sớm hơn; bỏ
  qua ví dụ khác level; lỗi `density-examples` (cả trường hợp 0 ví dụ cùng
  level), `missing-sentence`, `duplicate-id`.
- Unit test cảnh báo dồn (hàm thuần trả danh sách unit > ngưỡng).
- Data guard (`core-grammar-data.test.ts` hoặc file mới
  `grammar-placement-data.test.ts`): mọi điểm L2/L3 trong output có ≥2 ví dụ
  trong unit của nó; 2 id đã xóa không còn tồn tại.
- Build: 0 lỗi placement/validate, 0 curriculum-order violation; in ra các unit
  vượt ngưỡng dồn (kỳ vọng vài unit liên từ/thời gian).
- Toàn bộ test content / web / worker pass.

## 5. Ảnh hưởng và rủi ro

- ~113 điểm L2/L3 đổi unit (đa số về sớm hơn). Unit và từ không đổi → tiến độ
  đã lưu (`completed_lessons`) không lệch. Người học đã qua unit cũ sẽ gặp điểm
  ngữ pháp ở unit đã học (không mất nội dung, chỉ không thấy lại slide).
- Dồn ngữ pháp: l3-u01, l3-u03 (8 điểm), l3-u67 (7), l2-u58 (6)… — chấp nhận,
  phần 4 xử lý.
- Nội dung mới do AI viết → **cần người bản ngữ review trước khi deploy**.
