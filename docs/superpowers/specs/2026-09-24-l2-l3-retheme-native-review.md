# Chia lại chủ đề L2/L3 — cần người bản ngữ / người soạn giáo trình xem

Chủ đề con (`authored/themes/level{2,3}.json`) và câu mới (`s:l2:fill:112-184`,
`s:l3:fill:175-248`) do AI viết; cần review trước khi deploy.

## Quyết định chương trình còn mở
- Thứ tự unit xếp theo tần suất corpus → unit trừu tượng ("Suy Nghĩ") dồn đầu
  L2/L3, chủ đề đời thường (Ăn Uống, Mua Sắm, Trường Học, Du Lịch) về cuối. Spec
  chỉ cấm 2 unit liền nhau cùng chủ đề lớn. Nếu muốn đổi: thêm trọng số "cụ thể"
  theo chủ đề lớn hoặc giới hạn số unit Suy Nghĩ mỗi đoạn.
- Pin hiện có (`scripts/retheme-units.ts`): L2 可以/得→1, 条件→13, 取得→49,
  那样→15; L3 把→3. Pin là số unit — kiểm lại sau mọi thay đổi themes.

## Phân loại từ nên xem
- L3: 困 trong "Dễ, Khó & Phức Tạp" (nghĩa buồn ngủ); 光明 trong khí hậu (nghĩa bóng).
- Một số tên chủ đề lặp chủ đề lớn ("Xã Hội & Văn Hóa: Xã Hội & Công Bằng",
  "Kinh Tế & Kinh Doanh: Kinh Tế & Phát Triển"); L2 u46 / u48 tên gần giống nhau.
- Số hư từ mỗi unit 0-4 (không có guard).

## Câu nên xem
- L2: fill:116 (例如 một ví dụ), 118 ("bất mãn"), 144 (vi "đến tuổi trung niên"?),
  170, 177 (一斤 → "nửa cân"), 182, 183.
- L3: fill:176 (叫-bị động), 195, 204, 210, 214, 219, 220 ("Chú cún"?), 221, 241, 245
  (这是一个人工湖?).
- 7 lesson L3 chỉ có từ lệch chủ đề (随, 朝, 空, 人工, 短期, 决心, 初步) → câu trung tính.

## Dữ liệu (follow-up)
- 起来: course qǐlai, nhưng ~10 câu cũ và giải thích `g:v-qilai-inchoative` ghi qǐlái.
- 一只小狗: token 只 trỏ từ zhǐ nhưng đọc zhī (cần entry lượng từ).
- 14 từ L2 thiếu tần suất (giá trị 1000000 trong dữ liệu HSK).
