# Chia lại chủ đề L2/L3 và rải hư từ — Design

Date: 2026-09-24
Status: draft
Tiếp nối: `2026-09-24-lesson-sentence-coverage-design.md` (phần 3 của audit curriculum).

## 1. Mục tiêu và phạm vi

Đo trên output hiện tại (sau phần 3):

- Chủ đề bị gom thành khối dài, tên chỉ khác số thứ tự: L3 có 12 unit "Miêu Tả &
  Tính Chất" liền nhau, 8 "Xã Hội & Văn Hóa", 7 "Công Việc & Nghề Nghiệp". Nhóm
  "Miêu Tả" là nhóm vơ vét (l3-u13: 发生 情况 能力 存在…).
- Hư từ (liên từ, phó từ, giới từ, trợ từ) dồn ở các unit "Liên Từ & Cấu Trúc
  Câu", "Số Lượng & Mức Độ", "Thời Gian & Tần Suất" → ngữ pháp dồn theo: 4 unit
  "Liên Từ" L3 giữ 35/98 điểm ngữ pháp L3 (l3-u01: 12, l3-u03: 10); ~40 unit L3
  có 0 điểm. Build cảnh báo 13 unit > 5 điểm.

Mục tiêu:

1. Mỗi unit L2/L3 mang một chủ đề con có tên riêng; không có 2 unit liền nhau
   cùng chủ đề lớn.
2. Hư từ rải đều khắp level (1-2 từ/unit, từ phổ biến trước).
3. Không unit L2/L3 nào có > 5 điểm ngữ pháp.
4. Mọi guard hiện có vẫn pass (thứ tự chữ đơn → từ ghép, ≥2 ví dụ/điểm ngữ pháp,
   ≥1 câu/lesson, core grammar).

### Trong phạm vi

- Phân loại lại từ nội dung L2/L3 vào chủ đề con (dữ liệu authored mới).
- Script dựng lại `authored/units/level{2,3}.json` từ dữ liệu đó.
- Viết câu bù cho điểm ngữ pháp thiếu ví dụ và lesson trống sau khi dời từ.
- Guard mới cho thứ tự chủ đề, tên unit, dồn ngữ pháp L2/L3.

### Ngoài phạm vi

- L1 (unit, từ, câu giữ nguyên; `l1-u12` 9 điểm vẫn còn cảnh báo).
- Đổi bộ từ của level, đổi nội dung câu / ngữ pháp hiện có.
- Migrate tiến độ đã lưu: unit L2/L3 đổi nội dung → `completed_lessons` lệch;
  chấp nhận (như phần 1).

## 2. Phân loại từ

**Hư từ** = từ L2/L3 có `pos` chứa `c`, `d`, `p` hoặc `u` (đo 2026-09-24: L2 82,
L3 113). Còn lại là **từ nội dung**. Hư từ không mang chủ đề; chúng được rải ở
bước 3.

**Chủ đề con** — dữ liệu authored mới `packages/content/src/authored/themes/level{2,3}.json`:

```json
{
  "subthemes": [
    { "id": "work-office", "broad": "Công Việc", "title": "Công Việc: Văn Phòng" }
  ],
  "words": { "办公室": "work-office" }
}
```

- `broad`: chủ đề lớn, dạng rút gọn của 23 nhãn hiện có (vd "Công Việc",
  "Xã Hội", "Ăn Uống", "Miêu Tả"); viết giống hệt nhau cho mọi chủ đề con cùng
  chủ đề lớn trong một level. Không được chứa dấu `:`.
- `title`: `"<broad>: <chủ đề con>"`, tiếng Việt, không trùng trong level.
- Mỗi level ~30-45 chủ đề con; mỗi chủ đề con 8-16 từ nội dung (dưới 8 thì gộp
  vào chủ đề con gần nghĩa; trên 16 thì tách).
- `words` phủ đúng toàn bộ từ nội dung của level, mỗi từ một chủ đề con.
- Không có chủ đề con kiểu vơ vét ("Khác", "Tổng hợp", "Miêu Tả & Tính Chất"):
  tính từ/động từ trừu tượng được đặt vào chủ đề con nơi chúng hay dùng (vd
  健康 → Sức Khỏe, 能力 → Công Việc: Năng Lực).
- Do AI tạo (danh sách chủ đề con + gán từ); là nguồn chân lý, commit.

## 3. Dựng unit

Script `packages/content/scripts/retheme-units.ts --level <2|3>` (one-off, không
nằm trong build) dùng các hàm thuần trong `packages/content/src/pipeline/retheme.ts`:

1. **Cắt unit**: với mỗi chủ đề con, sắp từ theo `frequency` tăng dần (phổ biến
   trước), chia thành `max(1, round(n / 12))` unit đều nhau.
2. **Xếp thứ tự**: điểm mỗi unit = trung bình `frequency` của từ. Tham lam: lấy
   unit có điểm nhỏ nhất trong số còn lại có `broad` khác unit vừa đặt; nếu mọi
   unit còn lại cùng `broad` với unit trước thì lấy unit điểm nhỏ nhất.
3. **Tên**: `title` của chủ đề con; chủ đề con chia nhiều unit thì thêm hậu tố
   ` 1`, ` 2`… theo thứ tự xuất hiện.
4. **Rải hư từ**: sắp hư từ theo `frequency` tăng dần; hư từ thứ `i` (0-based) vào
   unit `floor(i * U / F)` (U = số unit, F = số hư từ), thêm vào **cuối** unit.
   **Pin** (bảng trong script) ép một từ vào unit số `k` của level, bỏ qua công
   thức: `可以`, `得` → unit 1 của L2 (để `g:keyi-permission`, `g:de-degree` vẫn ở
   đầu L2). Pin còn là núm chỉnh khi một unit bị dồn ngữ pháp (mục 4).
5. **Sửa thứ tự chữ đơn**: với mọi vi phạm `findOrderViolations` (chữ đơn là từ
   trong khóa, cùng level hoặc thấp hơn, dạy ở unit bằng hoặc sau unit của từ ghép chứa nó),
   dời chữ đơn về unit của từ ghép sớm nhất cần nó, chèn ngay trước từ ghép đó;
   lặp đến 0 vi phạm.
6. **Ghi** `authored/units/level<L>.json`: id `l<L>-uNN` đánh lại từ 01, `order`
   liên tục, giữ định dạng file hiện tại.

Script in thống kê: số unit, số từ min/max/unit, số hư từ/unit, số unit có hậu tố.

## 4. Sau khi dựng: build và sửa

Build content sẽ đặt lại câu và ngữ pháp theo từ. Xử lý theo thứ tự:

1. **Lỗi placement** (`density-examples`, `anchor-examples`): viết câu mới cho
   điểm ngữ pháp đó sao cho unit có từ khóa của mẫu có ≥2 ví dụ và dày nhất (như
   phần 2); thêm id vào `examples`. Id `s:l2:fill:NNN` / `s:l3:fill:NNN` nối tiếp
   dãy hiện có.
2. **Dồn ngữ pháp** (> 5 điểm ở unit L2/L3): thêm pin dời một hư từ từ khóa sang
   unit lân cận rồi dựng lại; lặp. Nếu không gỡ được bằng pin, được phép thêm câu
   để điểm đó dày hơn ở unit khác.
3. **Lesson trống**: chạy `lesson-gaps`, viết 1 câu/lesson trống (quy tắc câu như
   phần 3).
4. **Core grammar**: cập nhật map `CORE` trong `core-grammar-data.test.ts` cho 6
   điểm L2 theo unit mới của anchor; `g:keyi-permission`, `g:de-degree` phải ở
   `l2-u01`.

Quy tắc câu mới giống phần 3 (token là từ trong khóa theo đúng cách đọc của
entry, pinyin có dấu + biến điệu, 上/里 tách token = thanh đầy đủ, 不太 = bú tài,
vi tự nhiên).

## 5. Kiểm tra

- Unit test `retheme.ts`: cắt unit theo `round(n/12)`; thứ tự tham lam không đặt
  2 unit cùng `broad` liền nhau khi còn lựa chọn; rải hư từ đều + pin; sửa chữ
  đơn chèn trước từ ghép; tên có hậu tố khi chủ đề con chia nhiều unit.
- Data test mới `packages/content/test/retheme-data.test.ts` (đọc output shipped):
  - L2/L3: không có 2 unit liền nhau cùng `broad` (tiền tố trước `:` của title);
  - tên unit không trùng trong level;
  - không unit L2/L3 nào > 5 điểm ngữ pháp;
  - file `themes/level{2,3}.json` phủ đúng từ nội dung, không thừa/thiếu, mỗi
    chủ đề con được dùng.
- Guard hiện có pass: curriculum-order (0 vi phạm), core-grammar-data,
  lesson-coverage-data, mọi điểm L2/L3 ≥2 ví dụ trong unit.
- Build: 0 lỗi placement/validate; cảnh báo dồn chỉ còn unit L1.
- Toàn bộ test content / web / worker pass.

## 6. Ảnh hưởng và rủi ro

- ~1700 từ L2/L3 đổi unit; mọi câu/ngữ pháp L2/L3 được đặt lại tự động. Tiến độ
  đã lưu L2/L3 lệch (chấp nhận).
- Phân loại chủ đề do AI → có thể lệch nghĩa; reviewer mỗi task kiểm tra, và
  data test chặn phủ thiếu/thừa.
- Số câu bù chưa biết trước (ước tính 50-150); đo sau bước dựng unit.
- Nội dung mới do AI viết → **cần người bản ngữ review trước khi deploy**.
