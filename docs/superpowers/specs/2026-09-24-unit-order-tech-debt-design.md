# Thứ tự unit theo tier + dọn nợ kỹ thuật — Design

Date: 2026-09-24
Status: draft
Tiếp nối: `2026-09-24-l2-l3-retheme-design.md` (phần 4 của audit curriculum).

## 1. Mục tiêu và phạm vi

Đo trên output hiện tại (sau phần 4):

- Thứ tự unit L2/L3 theo tần suất corpus → unit trừu tượng dồn đầu level. L2
  quý đầu: 5 unit "Suy Nghĩ"; Trường Học (3), Ăn Uống (2), Sức Khỏe (1) ở quý
  cuối. L3 quý đầu: 4 "Suy Nghĩ", 2 "An Toàn & Pháp Luật"; Du Lịch, Mua Sắm,
  4 "Giải Trí" ở quý cuối.
- Pinyin câu không nhất quán: lint thử (so âm tiết/thanh với token) bắt ~80 chỗ
  lệch sau khi trừ các luật biến điệu hợp lệ (起来 qǐlái ×8, 学生 xuéshēng ×6,
  值得, 看上去, 过 guò, `yī gè` chưa biến điệu…); 在家 lúc `zàijiā` lúc `zài jiā`.
- 只 lượng từ (一只小狗) trỏ vào entry 只 zhǐ "chỉ", không có nghĩa lượng từ.
- `l1-u12` giữ 9 điểm ngữ pháp (cảnh báo dồn duy nhất còn lại).
- `useLiveQuery` nuốt lỗi (`console.error`), màn hình treo ở trạng thái loading.
- `apps/web/public/content/` bị `.gitignore` nhưng được commit bằng `git add -f`.
- Roadmap `docs/superpowers/plans/README.md` chỉ liệt kê phase 1-6.

Mục tiêu:

1. Unit L2/L3 cụ thể/đời thường đứng trước, trừu tượng lùi về sau, vẫn xen kẽ.
2. Mọi câu qua data test pinyin (mục 3).
3. Build 0 cảnh báo dồn ngữ pháp (kể cả L1).
4. Lỗi truy vấn IndexedDB hiện ra cho người dùng, có nút thử lại.
5. Content đã build được track bình thường; roadmap cập nhật.
6. Mọi guard hiện có vẫn pass.

### Ngoài phạm vi

- Nâng lesson 1 câu lên 2; độ phủ theo từ (mỗi từ ≥1 câu).
- Đổi bộ từ, chủ đề con, phân loại từ của L2/L3 (chỉ đổi thứ tự unit).
- Migrate tiến độ đã lưu (unit L2/L3 đổi thứ tự → lệch; chấp nhận như phần 4).

## 2. Thứ tự unit theo tier (L2/L3)

### Dữ liệu

`packages/content/src/authored/themes/level{2,3}.json` thêm map `tiers`:

```json
{ "tiers": { "Ăn Uống": 1, "Công Việc": 2, "Suy Nghĩ": 3 }, "subthemes": [], "words": {} }
```

- Khóa = mọi `broad` dùng trong `subthemes` của level, không thừa, không thiếu;
  giá trị ∈ {1, 2, 3}.
- Phân tier (áp dụng cho cả hai level, broad nào có trong level thì dùng):
  - **Tier 1** (cụ thể, đời thường): Ăn Uống, Mua Sắm, Trường Học, Nhà Cửa,
    Gia Đình & Quan Hệ, Giao Thông, Du Lịch, Thời Tiết & Thiên Nhiên, Sức Khỏe,
    Con Người & Ngoại Hình, Động Vật & Thực Vật, Thể Thao, Giải Trí, Thời Gian,
    Số Lượng.
  - **Tier 2**: Công Việc, Ngôn Ngữ & Giao Tiếp, Tính Cách & Cảm Xúc, Công Nghệ,
    Địa Lý & Vị Trí, Miêu Tả.
  - **Tier 3** (trừu tượng): Suy Nghĩ, Xã Hội & Văn Hóa, An Toàn & Pháp Luật,
    Kinh Tế & Kinh Doanh, Báo Chí & Truyền Thông.

### Thuật toán

Trong `packages/content/src/pipeline/retheme.ts`:

- `DraftUnit` thêm `tier: 1 | 2 | 3` (lấy từ `tiers[broad]` khi cắt unit;
  broad không có tier → throw).
- Hằng số `TIER_PENALTY = { 1: 0, 2: 0.15, 3: 0.35 }`.
- Khóa xếp của unit = `j / n_broad + 0.1 × rank / N + TIER_PENALTY[tier]`:
  - `j` = thứ tự 0-based của unit trong chủ đề lớn của nó (sắp theo `score` tăng
    dần), `n_broad` = số unit của chủ đề lớn đó → mỗi chủ đề lớn được rải đều
    trong khoảng của tier, unit đầu của mọi chủ đề đứng sớm;
  - `rank` = hạng 0-based của unit theo `score` trong cả level (hòa giữ thứ tự
    subtheme trong file), `N` = số unit của level → phân xử giữa các unit cùng
    `j / n_broad`, từ phổ biến trước.
- Mô phỏng trên dữ liệu hiện tại (2026-09-24): quý đầu 0 unit tier 3; unit đầu
  của mọi broad tier 1 nằm trong quý đầu (L2: Mua Sắm 3, Trường Học 12, Ăn Uống
  13); vị trí trung bình tier 1/2/3 = L2 24/34/43, L3 28/44/57. Chỉ sắp theo
  `rank + penalty` (không rải theo broad) để Ăn Uống/Trường Học L2 ở vị trí
  ~45-55 nên bị loại.
- `orderUnits` sắp theo khóa này thay cho `score`; phần còn lại giữ nguyên
  (không 2 unit liền nhau cùng `broad` khi còn lựa chọn; luật broad áp đảo).
- Các bước sau (`nameUnits`, `spreadFunctionWords`, `fixCharOrder`) không đổi.

### Dựng lại và sửa

Chạy `retheme-units --level 2` và `--level 3`, rồi xử lý như phần 4 mục 4:

1. **Pin**: pin là số unit → dẫn lại toàn bộ bảng `PINS` trong
   `scripts/retheme-units.ts` theo thứ tự mới. `可以`, `得` vẫn ép vào unit 1
   của L2; pin khác chỉ giữ nếu vẫn cần, mỗi pin có comment lý do.
2. **Lỗi placement** (`density-examples`, `anchor-examples`): viết câu mới, id
   `s:l2:fill:NNN` / `s:l3:fill:NNN` nối tiếp dãy hiện có.
3. **Dồn ngữ pháp** > 5 điểm/unit: pin hoặc câu bù (như phần 4).
4. **Lesson trống**: `lesson-gaps`, 1 câu/lesson trống.
5. **Core grammar**: cập nhật map `CORE` trong `core-grammar-data.test.ts`;
   `g:keyi-permission`, `g:de-degree` ở `l2-u01`.

Câu mới theo quy tắc câu hiện có và phải qua data test pinyin (mục 3).

### Guard

Thêm vào `packages/content/test/retheme-data.test.ts`, cho L2 và L3, tier của
unit lấy từ `tiers[broad]` với `broad` = tiền tố trước `:` của title:

- vị trí trung bình (index 0-based) của unit tier 1 < tier 2 < tier 3;
- trong `ceil(N / 4)` unit đầu, số unit tier 3 ≤ `floor(0.15 × ceil(N / 4))`;
- unit đầu tiên của mỗi broad tier 1 nằm trong `ceil(N / 2)` unit đầu.

`themes-data.test.ts`: `tiers` phủ đúng tập `broad` của level, giá trị ∈ {1,2,3}.

## 3. Data test pinyin

`packages/content/test/sentence-pinyin-data.test.ts`, đọc authored sentences và
`apps/web/public/content/words.json`. Với mỗi câu:

1. **Âm tiết**: bỏ dấu thanh, dấu câu, khoảng trắng, `'`, viết thường
   (ü ↔ `v`) → chuỗi âm tiết. Phải tách được thành chuỗi các token của `words`,
   mỗi token khớp một cách đọc của entry (chính hoặc `alternates`). Sai → lỗi
   `syllables`.
2. **Thanh điệu**: với cách đọc đã khớp, thanh viết của từng âm tiết phải bằng
   thanh của entry (thanh 5 = không dấu), trừ các luật sau (thanh bên phải là
   thanh được phép viết):
   - 不 (token 不 hoặc chữ đầu của từ bắt đầu bằng 不) trước âm tiết thanh 4 →
     2 (bắt buộc); ở giữa A-不-A hoặc bổ ngữ khả năng (V 不 C) → 5.
   - 一 (token 一 hoặc chữ đầu của từ bắt đầu bằng 一) trước thanh 4 → 2, trước
     thanh 1/2/3 → 4 (bắt buộc), trừ khi 一 là số đếm/thứ tự (sau 第, trong số
     như 十一, 一月, 一号, 一楼, đọc số) → 1; ở giữa láy động từ (V一V) → 5.
   - 个 → 5 hoặc 4.
   - 过, 了, 着 sau động từ → 5.
   - Âm tiết thứ hai của động từ láy (问问, 想想) → 5.
   - 好好 → `hǎohāo`.
   - Ngoại lệ còn lại khai báo trong allowlist `ALLOW` của test (id câu → lý do),
     mỗi mục có comment; allowlist kỳ vọng ≤ 10 mục.
3. **Cách đọc sai trong từ điển**: khi cách đọc của entry sai (vd thanh nhẹ không chuẩn),
   sửa bằng `packages/content/src/authored/pinyin-overrides.json`, không sửa
   câu cho khớp cách đọc sai.
4. **Ranh giới từ**:
   - Token 2 âm tiết viết liền một từ pinyin (在家 → `zàijiā`, 吃饭 → `chīfàn`),
     trừ `不太` `bú tài`, `有人` `yǒu rén` (quy ước đã có). Token ≥3 âm tiết
     được tách (打电话 `dǎ diànhuà`, 越来越 `yuè lái yuè`).
   - Hai token khác nhau không viết dính vào một từ pinyin, trừ: cặp 这个
     `zhège` / 那个 `nàge` / 哪个 `nǎge`; hậu tố 们 (`háizimen`); hai số liền
     nhau (`sānshí`, `yìbǎi`); token lặp (`wènwen`). Trợ từ 了/着/过 viết tách
     (`qù guo`, không `qùguo`).
   - Lỗi: `split` (token 2 âm tiết bị tách), `join` (hai token dính).
Thông báo lỗi: `<id> <loại> <token>: expected … got …`.

Sửa dữ liệu cho đến khi test pass; câu sửa giữ nguyên `zh`/`words` trừ khi
tokenization sai.

### 只 lượng từ

Thêm nghĩa lượng từ cho 只 trong `authored/meanings` (dạng "(zhī) lượng từ cho
con vật, chim"), để cả `zhǐ` lẫn `zhī` hiện khi tra từ; câu 我家养了一只小狗
viết `yì zhī`. Test pinyin chấp nhận `zhī` vì là `alternates`.

## 4. `l1-u12` dồn ngữ pháp

`l1-u12` (Tuần & Năm) có 9 điểm. Với mỗi điểm không có anchor (L1 unanchored =
unit có ví dụ sớm nhất), thêm 1 câu ví dụ ở unit L1 sớm hơn có đủ từ của mẫu và
thêm id vào `examples` của điểm đó, để điểm dời sang unit đó. Chọn điểm dời sao
cho `l1-u12` ≤ 5 và không unit L1 nào vượt 5. Điểm có anchor ở `l1-u12` thì
giữ. Id câu `s:l1:fill:NNN` nối tiếp.

Sau đó `MAX_GRAMMAR_PER_UNIT` áp cho mọi level: thêm vào `retheme-data.test.ts`
(hoặc test crowding hiện có) guard "không unit nào của L1/L2/L3 > 5 điểm", và
build 0 cảnh báo dồn.

## 5. `useLiveQuery` báo lỗi

`apps/web/src/db/use-live-query.ts`:

- Trả `{ data: T | undefined; error: unknown | undefined; retry: () => void }`.
  Lỗi từ `liveQuery` → set `error` (vẫn `console.error`); `retry()` xóa `error`
  và đăng ký lại subscription.
- Mọi nơi gọi (`UnitScreen`, `PathScreen`, `LessonFlow`) cập nhật: khi có
  `error` hiện `InlineError` hiện có (cùng kiểu với lỗi tải content) với thông
  điệp `"Could not read saved progress on this device."` và nút Retry gọi
  `retry`, thay vì loading mãi. Chữ tiếng Anh vì toàn bộ UI chrome hiện là tiếng
  Anh (`InlineError`, "This unit is locked"…); đổi ngôn ngữ UI ngoài phạm vi.
- Test (vitest + testing-library, như test web hiện có): querier reject → hook
  trả `error`; `retry` với querier thành công → `data` có giá trị, `error`
  undefined; `UnitScreen` hiện alert + Retry khi đọc `unitProgress` lỗi.

## 6. Content build được track

- Xóa dòng `apps/web/public/content/` trong `.gitignore`.
- Không đổi file content nào (đã được track). Kiểm tra `git status` sạch sau
  `pnpm content:build`.
- Cập nhật chỗ nào trong docs/memory/plan nói "`git add -f`" nếu là hướng dẫn
  đang dùng (README, CLAUDE.md của repo nếu có).

## 7. Roadmap

`docs/superpowers/plans/README.md`: thêm phase 7-8 và các phần audit curriculum
(core grammar, placement L2/L3, câu cho mọi lesson, chia lại chủ đề, thứ tự tier
+ nợ kỹ thuật) với link spec/plan và trạng thái; ghi mục còn mở (native review,
lesson 1 câu, độ phủ theo từ).

## 8. Thứ tự làm

1. Data test pinyin + sửa dữ liệu + 只 (mục 3) — trước, để câu mới sau đó cũng
   qua lint.
2. Tier + dựng lại L2/L3 + sửa placement/dồn/lesson trống/CORE + guard (mục 2).
3. `l1-u12` + guard dồn mọi level (mục 4).
4. `useLiveQuery` (mục 5).
5. `.gitignore` + roadmap (mục 6, 7).

## 9. Kiểm tra

- Unit test `retheme.ts`: khóa tier đẩy unit tier 3 điểm thấp ra sau unit tier 1;
  unit đầu của một broad tier 1 điểm cao vẫn đứng trước unit thứ hai của broad
  tier 1 điểm thấp; luật không liền broad vẫn giữ; broad thiếu tier → throw.
- Data test mới/đổi: `sentence-pinyin-data`, `retheme-data` (tier + dồn mọi
  level), `themes-data` (tiers).
- Build: 0 lỗi placement/validate, 0 cảnh báo dồn, 0 curriculum-order violation;
  `lesson-gaps` 0 lesson trống cả 3 level.
- Toàn bộ test content / web / worker pass; `pnpm typecheck`/lint pass.

## 10. Ảnh hưởng và rủi ro

- Thứ tự unit L2/L3 đổi lần nữa → tiến độ đã lưu lệch (chấp nhận).
- Phân tier là phán đoán; data guard chỉ chặn trường hợp dồn thô, không đảm bảo
  "hay" — người review xem danh sách unit mới.
- Luật thanh điệu trong test là quy ước của khóa, không phải chuẩn duy nhất;
  ngoại lệ đi vào allowlist có lý do.
- Câu mới và câu sửa do AI viết → **cần người bản ngữ review trước khi deploy**;
  cập nhật danh sách native-review.
