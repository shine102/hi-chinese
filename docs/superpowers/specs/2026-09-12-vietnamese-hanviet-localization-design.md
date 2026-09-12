# Việt hóa nội dung + Âm Hán Việt + Sắp lại curriculum — Design

Date: 2026-09-12
Status: draft

## 1. Mục tiêu và phạm vi

Chuyển ngôn ngữ dạy của Hi Chinese từ tiếng Anh sang **tiếng Việt**, bổ sung
**âm Hán Việt** (mức chữ và mức từ) theo phong cách HelloChinese bản Việt, và
**sắp lại curriculum** để chữ đơn được học trước từ ghép cấu thành nó (không còn
cảnh unit đầu đã dạy từ 3 chữ như `对不起`, `没关系`).

Phạm vi: **toàn bộ HSK1-3** (2.209 từ hiện có).

### Trong phạm vi

- Nghĩa tiếng Việt thay tiếng Anh cho: từ vựng, định nghĩa chữ, câu ví dụ, điểm ngữ pháp.
- Âm Hán Việt cho mọi chữ và mọi từ trong khóa.
- Curate unit theo chủ đề cho cả L1, L2, L3, với nguyên tắc chữ-đơn-trước-từ-ghép.
- Web hiển thị nghĩa Việt + âm Hán Việt; bỏ tiếng Anh khỏi nội dung học.

### Ngoài phạm vi

- Dịch phần chrome/UI khác của app (nút, nhãn điều hướng) — chỉ đụng nội dung học.
- Speaking/pronunciation, games, đa người dùng (như spec gốc).
- Thêm cấp HSK4+.

## 2. Bối cảnh: pipeline đã "trôi" khỏi output

Phát hiện then chốt định hình toàn bộ thiết kế:

- Nội dung ship nằm ở `apps/web/public/content/` (commit vào repo, 1086 file).
- **L1 (42 unit)** đã được **chỉnh tay trực tiếp trong output** thành unit theo chủ đề
  ("Hello!", "Reading & Writing"...). Các commit `677de13`, `802eb28` chỉ sửa file dưới
  `apps/web/public/content/`, không đụng source pipeline.
- **L2 (63 unit), L3 (79 unit)** vẫn là output thô: "Unit 1".."Unit N", chunk 12 từ theo
  tần suất.
- Pipeline source (`packages/content/src/pipeline/units.ts`) chỉ sinh được "Unit N" theo
  tần suất — **không tái tạo được** cấu trúc chủ đề của L1. `loadAuthored` hiện chỉ đọc
  sentences, grammar, pinyin-overrides; **không có khái niệm authored units**.

Hệ quả: chạy lại pipeline như hiện tại sẽ **xóa** toàn bộ curate L1. Vì vậy trước khi thêm
ngôn ngữ, phải đưa cấu trúc unit về làm **dữ liệu authored** để pipeline tái lập được, rồi
mọi thay đổi mới đi qua pipeline (một nguồn sự thật).

Hướng đã chốt: **A — đưa mọi thứ về pipeline**, chia phase để mỗi phase ship được.

## 3. Data model (`packages/content/src/types.ts`)

Thay đổi:

- `Word`
  - `meanings: string[]` — ngữ nghĩa **tiếng Việt** (thay tiếng Anh).
  - `hanViet: string` (mới) — âm Hán Việt mức từ, ghép hoa mỗi âm, vd 再见 → `"Tái Kiến"`.
- `CharacterData`
  - `definition: string | null` — định nghĩa **tiếng Việt**.
  - `hanViet: string` (mới) — âm Hán Việt mức chữ, vd 见 → `"Kiến"`. Giữ `pinyin`, `radical`, `decomposition`.
- `Sentence`: `en: string` → **`vi: string`**.
- `AuthoredSentence`: `en` → **`vi`**.
- `GrammarPoint` & `AuthoredGrammar`: `title`, `explanation` → **tiếng Việt** (đổi nội dung, không đổi kiểu).
- `AuthoredUnit` (kiểu mới):
  ```ts
  interface AuthoredUnit {
    id: string;        // vd "l1-u01"
    level: HskLevel;
    order: number;     // thứ tự trong cấp
    title: string;     // tên chủ đề tiếng Việt
    words: string[];   // simplified, theo thứ tự dạy
  }
  ```
- `alternates: WordReading[]`: giữ cấu trúc; `meanings` bên trong không hiển thị trên UI học
  nên để nguyên (không bắt buộc dịch) — tránh phình phạm vi.

## 4. Nguồn dữ liệu authored mới (commit vào repo)

Đặt dưới `packages/content/src/authored/`:

- `units/level1.json`, `units/level2.json`, `units/level3.json` — mảng `AuthoredUnit`.
  Nguồn sự thật cho cấu trúc + tên + thứ tự từ của từng cấp.
- `hanviet/char-map.json` — `Record<string /*ký tự*/, string /*âm Hán Việt Title Case*/>`.
  Phủ mọi ký tự dùng trong HSK1-3. Chọn âm phổ biến nhất làm mặc định cho chữ đa âm.
- `hanviet/word-overrides.json` — `Record<string /*simplified*/, string /*âm mức từ*/>`.
  Override cho từ mà ghép âm mặc định sẽ sai (đa âm/thành ngữ), vd 银行 → `"Ngân Hàng"`.
- `meanings/*.json` — `Record<string /*simplified*/, string[]>`. Nghĩa tiếng Việt theo từ.
  **Nguồn sự thật cho nghĩa từ.** Có thể chia nhiều file theo cấp; loader gộp.
- `char-definitions/*.json` — `Record<string /*ký tự*/, string>`. Định nghĩa chữ tiếng Việt.

Loader (`pipeline/authored.ts`) mở rộng để đọc thêm các nguồn trên; thiếu file thì trả rỗng
(giữ hành vi khoan dung như hiện tại với overrides).

## 5. Nguồn âm Hán Việt

Âm Hán Việt là dữ liệu **suy ra được, tin cậy cao** (khác nghĩa Việt phải dịch):

- Dựng `char-map.json` phủ toàn bộ tập `characters` của HSK1-3 (~1.3-1.5k chữ), lấy từ
  dataset Hán-Việt/Unihan mở rồi rà lại thủ công các chữ tần suất cao.
- Âm mức từ = ghép âm mặc định của từng chữ (Title Case, nối bằng dấu cách); từ nào có trong
  `word-overrides.json` thì lấy override.
- Rule validate cảnh báo mọi ký tự trong khóa thiếu trong `char-map.json` để không sót.

## 6. Nguồn nghĩa tiếng Việt

Chiến lược đã chốt: **dataset + Claude bù chỗ thiếu**, với authored là nguồn sự thật.

- Ưu tiên tìm một dataset Trung-Việt mã nguồn mở license tương thích; nếu có, pin theo commit
  như các `SOURCES` khác và dùng làm **seed** ghi vào `meanings/*.json`.
- Nếu không có dataset phù hợp: nghĩa do Claude dịch, **người dùng review**, commit vào
  `meanings/*.json`. Đây là đường lui luôn khả thi và vẫn đạt mục tiêu.
- Định nghĩa chữ (`char-definitions`) xử lý tương tự: seed từ makemeahanzi (dịch) hoặc author.

Trong giai đoạn chuyển tiếp, pipeline cho phép **fallback về tiếng Anh** khi thiếu nghĩa Việt
(để build không vỡ), nhưng rule validate đánh dấu các từ/chữ còn thiếu nghĩa Việt.

## 7. Thay đổi pipeline (`packages/content/src/pipeline/`)

- `hanviet.ts` (mới): load `char-map` + `word-overrides`; `charHanViet(ch)`, `wordHanViet(word)`.
- `authored.ts`: đọc thêm units, hanviet maps, meanings, char-definitions.
- `hsk.ts` (`normalizeWord`): `meanings` lấy từ authored VI meanings theo simplified
  (fallback English khi thiếu); gắn `hanViet` cho từ.
- `characters.ts`: `definition` lấy authored VI (fallback English); gắn `hanViet` cho chữ.
- `units.ts` (`assignUnits`): nếu cấp có authored units → dựng unit từ đó (id/title/order/thứ tự
  từ theo authored); nếu không → fallback chunk-theo-tần-suất như cũ. Fallback bổ sung
  **sắp chữ-đơn-trước-từ-ghép** trong mỗi cấp (ổn định theo tần suất) — dùng khi thiếu authored.
- `placement.ts`: sentence dùng `vi` thay `en`.
- `build.ts`: serialize field mới (`hanViet` ở word/character, `vi` ở sentence).
- `validate.ts`: rule mới —
  - mọi từ có `hanViet` không rỗng và có nghĩa Việt;
  - mọi chữ có `hanViet` không rỗng;
  - mọi ký tự trong khóa có trong `char-map.json`;
  - authored units của mỗi cấp phủ **đúng và đủ** tập từ của cấp đó (không sót, không trùng, không lạ);
  - cảnh báo (không fail) khi một từ ghép xuất hiện ở unit trước unit dạy chữ đơn cấu thành,
    *nếu* chữ đơn đó là một từ trong khóa — làm kim chỉ nam khi curate.

## 8. Curriculum theo chủ đề + độ khó

Nguyên tắc áp cho cả L1, L2, L3 khi author `units/levelN.json`:

- Gom từ theo chủ đề, đặt tên unit tiếng Việt.
- Từ ghép chỉ xuất hiện ở/sau unit đã dạy các chữ đơn cấu thành (khi chữ đó là từ trong khóa).
- Dời từ 3+ chữ (对不起, 没关系, 不客气...) xuống sau.
- Ngoại lệ: giữ vài lời chào nguyên khối tần suất cực cao (谢谢) học sớm, chấp nhận holistic.
- Rule cảnh báo ở mục 7 hỗ trợ phát hiện vi phạm nguyên tắc.

Mục tiêu số lượng: giữ ~12 từ/unit làm mốc mềm, cho phép co giãn theo chủ đề (không cứng nhắc).

## 9. Web (`apps/web/src/`)

- `lessons/LessonFlow.tsx`: nghĩa hiện là tiếng Việt (`word.meanings`); thêm dòng **âm Hán Việt**
  cạnh pinyin (`word.hanViet`); câu dùng `s.vi`; danh sách từ dùng `w.meanings[0]` (đã là Việt).
- `exercises/generate.ts`: đáp án nhiễu và nhãn lấy từ nghĩa Việt; câu dùng `sentence.vi`.
- `character/CharacterPage.tsx`: hiển thị `character.hanViet` + định nghĩa Việt.
- Các component khác tham chiếu `meanings`/`.en`/`definition` (WriteIt, MatchPairs, FillBlank,
  SentenceBuilder, ListenPick, StrokesSheet): rà và chuyển sang field mới (`vi`) + nội dung Việt.
- Bỏ chuỗi tiếng Anh khỏi nội dung học; chrome/app khác không đụng.

## 10. Phase (mỗi phase ship được, có test)

- **P0 — Lưới an toàn (refactor thuần):** thêm kiểu `AuthoredUnit` + đọc authored units;
  trích **L1** hiện tại thành `units/level1.json`; pipeline dựng L1 từ authored, L2/L3 giữ
  fallback "Unit N". Regenerate `apps/web/public/content` và verify **`git diff` rỗng** (byte-identical).
  Không đổi hành vi web.
- **P1 — Âm Hán Việt:** `char-map` + `word-overrides` + `hanviet.ts`; field `hanViet`;
  web hiển thị. English vẫn là ngôn ngữ nghĩa ở phase này.
- **P2 — Nghĩa tiếng Việt:** `meanings/*` + `char-definitions/*`; đổi `en`→`vi`; dịch grammar
  title/explanation và câu; web bỏ tiếng Anh. Fallback English khi thiếu, validate đánh dấu thiếu.
- **P3 — Độ khó L1:** curate lại `units/level1.json` theo chủ đề + chữ-đơn-trước; regenerate.
- **P4 — L2 theo chủ đề:** author `units/level2.json`; regenerate.
- **P5 — L3 theo chủ đề:** author `units/level3.json`; regenerate.

Mỗi phase một PR/đợt review riêng; P4/P5 nặng về author nội dung, cần người dùng duyệt kỹ.

## 11. Test

- Unit: `hanviet.ts` (ghép + override + Title Case); `units.ts` (authored / fallback / sắp
  chữ-đơn); `hsk.ts` (nghĩa Việt + fallback); các rule `validate.ts`.
- P0: test tái lập — pipeline output khớp `public/content` hiện tại cho L1 (byte-identical).
- Placement: sentence `vi` xử lý đúng.
- Web: component/e2e cho hiển thị nghĩa Việt + âm Hán Việt (word, sentence, character page).

## 12. Rủi ro & lưu ý

- **Chữ đa âm (polyphone):** ghép âm mặc định có thể sai ở mức từ → cần `word-overrides` cho tập
  đủ lớn; rule validate không bắt được sai *ngữ nghĩa* của âm, cần người review.
- **Chất lượng nghĩa Việt do AI:** nội dung AI sinh cần người dùng review trước khi coi là chuẩn
  (theo yêu cầu review nội dung ngoài của tổ chức khi phát hành).
- **Khối lượng P4/P5 lớn:** ~1.700 từ, curate chủ đề là quyết định sư phạm; tách phase để review.
- **Constituent char không phải từ trong khóa:** không ép được thứ tự (vd 起 trong 对不起 nếu 起
  không là từ) → chấp nhận holistic, chỉ cảnh báo khi chữ đơn *là* từ trong khóa.
