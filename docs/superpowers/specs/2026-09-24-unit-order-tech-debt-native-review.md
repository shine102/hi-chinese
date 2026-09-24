# Thứ tự unit theo tier + nợ kỹ thuật — cần người bản ngữ xem

Câu mới, pinyin đã sửa và cách đọc từ đã sửa đều do AI quyết định; cần review trước khi deploy.

## Quyết định chương trình nên xem
- Tier chủ đề lớn (`authored/themes/level{2,3}.json` → `tiers`): 1 = đời thường, 2 = trung gian, 3 = trừu tượng. Unit tier 1 lên trước, tier 3 về sau.
- Pin (`scripts/retheme-units.ts`): L2 可以/得→1, 只要→26, 虽然→28, 特别→21, 带来→39 (anchor của 是…的, để không nằm ở unit cuối); L3 把→4, 为了→23, 被→13.
- Ngữ pháp L1 dời sớm hơn nhờ câu ví dụ mới: 别/没/多少 → l1-u07, 先/请 → l1-u04, 常 → l1-u09, 呢 → l1-u02, 一下儿 → l1-u15, 干什么 → l1-u22.

## Cách đọc từ đã sửa (`authored/reading-fixes.json`)
- Nguồn ghi sai định dạng hoặc thanh không chuẩn, sửa thành: 这时候 `zhe4 shi2 hou5`, 不一会儿 `bu4 yi1 hui4 r5`, 见过 `jian4 guo5`, 笑话儿 `xiao4 hua5 r5`, 有空儿 `you3 kong4 r5`, 能不能 `neng2 bu5 neng2`, 值得 `zhi2 de2`, 记住 `ji4 zhu4`, 事实上 `shi4 shi2 shang5`, 出去 `chu1 qu5`, 进来 `jin4 lai5`, 真的 `zhen1 de5`.
- Trong đó đổi thanh so với nguồn: 值得 (nguồn zhíde), 记住 (jìzhu), 事实上 (shàng), 出去 (chūqù), 进来 (jìnlái), 真的 (de thiếu số thanh).
- Thêm sau review: 那里 `na4 li3` (nguồn nàli), cho khớp 这里 zhèlǐ, 哪里 nǎlǐ; 2 câu L1 đổi theo (Tā zài nàlǐ. / Wǒmen qù nàlǐ ba.).
- Giữ theo nguồn, sửa câu cho khớp: 学生 xuésheng, 那里 nàli, 起来 qǐlai, 看上去 kàn shangqu, 回来 huílai, 照顾 zhàogu, 带来 dàilái, 小朋友 xiǎopéngyǒu.
- 只: thêm nghĩa "(zhī) lượng từ cho con vật, chim".

## Quy ước pinyin (data test `sentence-pinyin-data`)
- 不/一 biến điệu bắt buộc; 不 nhẹ trong A-不-A và bổ ngữ khả năng; 一 giữ thanh 1 khi đếm/thứ tự.
- Token 2 âm tiết viết liền (吃饭 chīfàn, 在家 zàijiā); 了/着/过 viết tách (qù guo).
- Ngoại lệ: s:l2:362 (高一年级 yì), s:l2:fill:096 (一加一 yī).

## Câu cụ thể nên xem (từ final review)
- s:l1:fill:041 你们家多少人？ — khẩu ngữ, bỏ 有; thêm 有 thì câu dời sang l1-u08 (đang đủ 5 điểm).
- s:l2:316 请走进来 → `Qǐng zǒujìn lái` do tách token 走进 + 来; người học quen `zǒu jìnlai`.
- 这里 `zhèlǐ` nhưng 那里 `nàli` (theo từ điển); 不够/不用 liền khi là 1 token, tách khi 2 token.
- Quy ước viết tách 了/着/过 (`qù guo`) khác GB/T 16159 (viết liền `qùguo`) — spec chọn tách; xác nhận.
- g:yi-jiu (anchor 哭) giờ ở l2-u32 (54% L2); pin 哭 nếu muốn sớm hơn.

## Câu mới (60)

| id | zh | pinyin | vi |
|---|---|---|---|
| s:l1:fill:036 | 别问他们。 | Bié wèn tāmen. | Đừng hỏi họ. |
| s:l1:fill:037 | 我没问他们。 | Wǒ méi wèn tāmen. | Tôi chưa hỏi họ. |
| s:l1:fill:038 | 你先介绍你妈妈。 | Nǐ xiān jièshào nǐ māma. | Bạn giới thiệu mẹ bạn trước đi. |
| s:l1:fill:039 | 我们常在这里。 | Wǒmen cháng zài zhèlǐ. | Chúng tôi hay ở đây. |
| s:l1:fill:040 | 我是他朋友，你呢？ | Wǒ shì tā péngyou, nǐ ne? | Tôi là bạn của anh ấy, còn bạn? |
| s:l1:fill:041 | 你们家多少人？ | Nǐmen jiā duōshao rén? | Nhà các bạn có bao nhiêu người? |
| s:l1:fill:042 | 请介绍你的朋友。 | Qǐng jièshào nǐ de péngyou. | Hãy giới thiệu bạn của bạn đi. |
| s:l1:fill:043 | 请介绍一下儿你的家人。 | Qǐng jièshào yíxiàr nǐ de jiārén. | Hãy giới thiệu một chút về gia đình bạn. |
| s:l1:fill:044 | 你们在干什么？ | Nǐmen zài gàn shénme? | Các bạn đang làm gì vậy? |
| s:l2:fill:185 | 银行不收我的卡。 | Yínháng bù shōu wǒ de kǎ. | Ngân hàng không nhận thẻ của tôi. |
| s:l2:fill:186 | 我的狗又不吃东西了。 | Wǒ de gǒu yòu bù chī dōngxi le. | Con chó của tôi lại không chịu ăn rồi. |
| s:l2:fill:187 | 他留下了一本书。 | Tā liúxià le yì běn shū. | Anh ấy để lại một cuốn sách. |
| s:l2:fill:188 | 你走错方向了。 | Nǐ zǒu cuò fāngxiàng le. | Bạn đi sai hướng rồi. |
| s:l2:fill:189 | 我等了十分钟。 | Wǒ děng le shí fēnzhōng. | Tôi đã đợi mười phút. |
| s:l2:fill:190 | 我常常运动。 | Wǒ chángcháng yùndòng. | Tôi thường xuyên tập thể dục. |
| s:l2:fill:191 | 他的汉语水平很高。 | Tā de Hànyǔ shuǐpíng hěn gāo. | Trình độ tiếng Trung của anh ấy rất cao. |
| s:l2:fill:192 | 这次考试的分数很高。 | Zhè cì kǎoshì de fēnshù hěn gāo. | Điểm bài thi lần này rất cao. |
| s:l2:fill:193 | 我们晚上去听音乐会吧。 | Wǒmen wǎnshang qù tīng yīnyuèhuì ba. | Buổi tối chúng ta đi nghe hòa nhạc nhé. |
| s:l2:fill:194 | 你不要笑话我。 | Nǐ búyào xiàohua wǒ. | Bạn đừng cười nhạo tôi. |
| s:l2:fill:195 | 他明天出院。 | Tā míngtiān chūyuàn. | Ngày mai anh ấy xuất viện. |
| s:l2:fill:196 | 你可以穿黑色或者白色的衣服。 | Nǐ kěyǐ chuān hēisè huòzhě báisè de yīfu. | Bạn có thể mặc quần áo màu đen hoặc màu trắng. |
| s:l2:fill:197 | 多数学生都喜欢这个老师。 | Duōshù xuésheng dōu xǐhuan zhège lǎoshī. | Phần lớn học sinh đều thích giáo viên này. |
| s:l2:fill:198 | 我喜欢打篮球。 | Wǒ xǐhuan dǎ lánqiú. | Tôi thích chơi bóng rổ. |
| s:l2:fill:199 | 我很喜欢吃饺子。 | Wǒ hěn xǐhuan chī jiǎozi. | Tôi rất thích ăn sủi cảo. |
| s:l2:fill:200 | 他晚上常常吃方便面。 | Tā wǎnshang chángcháng chī fāngbiànmiàn. | Buổi tối anh ấy thường ăn mì ăn liền. |
| s:l2:fill:201 | 欢迎你来我家！ | Huānyíng nǐ lái wǒ jiā! | Chào mừng bạn đến nhà tôi! |
| s:l2:fill:202 | 这里多么漂亮！ | Zhèlǐ duōme piàoliang! | Ở đây đẹp biết bao! |
| s:l2:fill:203 | 你可以随时来找我。 | Nǐ kěyǐ suíshí lái zhǎo wǒ. | Bạn có thể đến tìm tôi bất cứ lúc nào. |
| s:l2:fill:204 | 假期你想去哪儿？ | Jiàqī nǐ xiǎng qù nǎr? | Kỳ nghỉ bạn muốn đi đâu? |
| s:l3:fill:249 | 受伤以后，他的腿痛起来了。 | Shòushāng yǐhòu, tā de tuǐ tòng qǐlai le. | Sau khi bị thương, chân anh ấy bắt đầu đau. |
| s:l3:fill:250 | 电影开始了。 | Diànyǐng kāishǐ le. | Phim bắt đầu rồi. |
| s:l3:fill:251 | 我的花死了。 | Wǒ de huā sǐ le. | Cây hoa của tôi chết rồi. |
| s:l3:fill:252 | 他的爷爷去年去世了。 | Tā de yéye qùnián qùshì le. | Ông của anh ấy đã qua đời năm ngoái. |
| s:l3:fill:253 | 我们明天有比赛。 | Wǒmen míngtiān yǒu bǐsài. | Ngày mai chúng tôi có trận đấu. |
| s:l3:fill:254 | 农业对这个国家很重要。 | Nóngyè duì zhège guójiā hěn zhòngyào. | Nông nghiệp rất quan trọng đối với đất nước này. |
| s:l3:fill:255 | 这里有很多美食。 | Zhèlǐ yǒu hěn duō měishí. | Ở đây có rất nhiều món ngon. |
| s:l3:fill:256 | 你的行李在哪儿？ | Nǐ de xíngli zài nǎr? | Hành lý của bạn ở đâu? |
| s:l3:fill:257 | 书在桌子上面。 | Shū zài zhuōzi shàngmiàn. | Sách ở trên bàn. |
| s:l3:fill:258 | 这里有一群孩子。 | Zhèlǐ yǒu yì qún háizi. | Ở đây có một nhóm trẻ con. |
| s:l3:fill:259 | 这个工厂加工水果。 | Zhège gōngchǎng jiāgōng shuǐguǒ. | Nhà máy này chế biến trái cây. |
| s:l3:fill:260 | 他打破了自己的纪录。 | Tā dǎpò le zìjǐ de jìlù. | Anh ấy đã phá kỷ lục của chính mình. |
| s:l3:fill:261 | 他帮我修电脑。 | Tā bāng wǒ xiū diànnǎo. | Anh ấy giúp tôi sửa máy tính. |
| s:l3:fill:262 | 他们的感情很好。 | Tāmen de gǎnqíng hěn hǎo. | Tình cảm của họ rất tốt. |
| s:l3:fill:263 | 春节的时候，我想和亲人在一起。 | Chūnjié de shíhou, wǒ xiǎng hé qīnrén zài yìqǐ. | Dịp Tết, tôi muốn ở bên người thân. |
| s:l3:fill:264 | 他不断地练习。 | Tā búduàn de liànxí. | Anh ấy luyện tập không ngừng. |
| s:l3:fill:265 | 这个概念很难懂。 | Zhège gàiniàn hěn nán dǒng. | Khái niệm này rất khó hiểu. |
| s:l3:fill:266 | 我的手表不准。 | Wǒ de shǒubiǎo bù zhǔn. | Đồng hồ của tôi chạy không đúng giờ. |
| s:l3:fill:267 | 开车的时候要时刻小心。 | Kāichē de shíhou yào shíkè xiǎoxīn. | Khi lái xe phải luôn cẩn thận. |
| s:l3:fill:268 | 上课以前要预习。 | Shàngkè yǐqián yào yùxí. | Trước khi lên lớp cần chuẩn bị bài. |
| s:l3:fill:269 | 这个公司有很多人才。 | Zhège gōngsī yǒu hěn duō réncái. | Công ty này có nhiều nhân tài. |
| s:l3:fill:270 | 自从上大学以后，他很少回家。 | Zìcóng shàng dàxué yǐhòu, tā hěn shǎo huíjiā. | Từ khi lên đại học, anh ấy ít về nhà. |
| s:l3:fill:271 | 我去市场买菜。 | Wǒ qù shìchǎng mǎi cài. | Tôi đi chợ mua thức ăn. |
| s:l3:fill:272 | 他的志愿是当医生。 | Tā de zhìyuàn shì dāng yīshēng. | Nguyện vọng của anh ấy là làm bác sĩ. |
| s:l3:fill:273 | 这是一个民间故事。 | Zhè shì yí ge mínjiān gùshi. | Đây là một câu chuyện dân gian. |
| s:l3:fill:274 | 他长期住在国外。 | Tā chángqī zhù zài guówài. | Anh ấy sống ở nước ngoài lâu năm. |
| s:l3:fill:275 | 这篇文章的内容很有意思。 | Zhè piān wénzhāng de nèiróng hěn yǒu yìsi. | Nội dung bài viết này rất thú vị. |
| s:l3:fill:276 | 高速上不能停车。 | Gāosù shàng bù néng tíngchē. | Không được dừng xe trên đường cao tốc. |
| s:l3:fill:277 | 老师批评了他。 | Lǎoshī pīpíng le tā. | Giáo viên đã phê bình anh ấy. |
| s:l3:fill:278 | 经济增长得很快。 | Jīngjì zēngzhǎng de hěn kuài. | Kinh tế tăng trưởng rất nhanh. |
| s:l3:fill:279 | 他定期去看医生。 | Tā dìngqī qù kàn yīshēng. | Anh ấy đi khám bác sĩ định kỳ. |

## Câu đã sửa (121)

| id | zh | pinyin cũ → mới | ghi chú |
|---|---|---|---|
| s:l1:100 | 这是第二个。 | Zhè shì dì èr gè. → Zhè shì dì'èr gè. |  |
| s:l1:101 | 他是第二。 | Tā shì dì èr. → Tā shì dì'èr. |  |
| s:l1:102 | 我先看第二个。 | Wǒ xiān kàn dì èr gè. → Wǒ xiān kàn dì'èr gè. |  |
| s:l1:103 | 那个是第二。 | Nàge shì dì èr. → Nàge shì dì'èr. |  |
| s:l1:111 | 这是第二个，不是两个。 | Zhè shì dì èr gè, bú shì liǎng gè. → Zhè shì dì'èr gè, bú shì liǎng gè. |  |
| s:l1:117 | 他在那里。 | Tā zài nàlǐ. → Tā zài nàli. |  |
| s:l1:119 | 我们去那里吧。 | Wǒmen qù nàlǐ ba. → Wǒmen qù nàli ba. |  |
| s:l1:216 | 我等了半天。 | Wǒ děngle bàntiān. → Wǒ děng le bàntiān. |  |
| s:l1:217 | 他学了半年。 | Tā xuéle bànnián. → Tā xué le bànnián. |  |
| s:l1:new:040 | 他生病。 | Tā shēng bìng. → Tā shēngbìng. |  |
| s:l1:new:042 | 他去医院看病。 | Tā qù yīyuàn kàn bìng. → Tā qù yīyuàn kànbìng. |  |
| s:l1:new:082 | 下雨。 | Xià yǔ. → Xiàyǔ. |  |
| s:l1:new3:019 | 中国是一个大国家。 | Zhōngguó shì yī gè dà guójiā. → Zhōngguó shì yí ge dà guójiā. |  |
| s:l1:new3:028 | 一个本子。 | Yī gè běnzi. → Yí ge běnzi. |  |
| s:l1:new3:031 | 小朋友们好！ | Xiǎopéngyoumen hǎo! → Xiǎopéngyǒumen hǎo! |  |
| s:l1:core:023 | 妈妈做了三个菜。 | Māma zuòle sān ge cài. → Māma zuò le sān ge cài. |  |
| s:l1:core:024 | 我给了他一杯水。 | Wǒ gěile tā yì bēi shuǐ. → Wǒ gěi le tā yì bēi shuǐ. |  |
| s:l1:core:025 | 你拿了我的杯子吗？ | Nǐ nále wǒ de bēizi ma? → Nǐ ná le wǒ de bēizi ma? |  |
| s:l1:core:029 | 我不想吃饭。 | Wǒ bù xiǎng chī fàn. → Wǒ bù xiǎng chīfàn. |  |
| s:l1:core:031 | 他站着吃饭。 | Tā zhànzhe chī fàn. → Tā zhàn zhe chīfàn. |  |
| s:l1:core:032 | 那儿放着一杯水。 | Nàr fàngzhe yì bēi shuǐ. → Nàr fàng zhe yì bēi shuǐ. |  |
| s:l1:core:033 | 你坐着，我给你拿水。 | Nǐ zuòzhe, wǒ gěi nǐ ná shuǐ. → Nǐ zuò zhe, wǒ gěi nǐ ná shuǐ. |  |
| s:l1:core:034 | 他在那儿站着。 | Tā zài nàr zhànzhe. → Tā zài nàr zhàn zhe. |  |
| s:l1:core:038 | 他从早上到现在都没吃饭。 | Tā cóng zǎoshang dào xiànzài dōu méi chī fàn. → Tā cóng zǎoshang dào xiànzài dōu méi chīfàn. |  |
| s:l1:core:039 | 我去过北京。 | Wǒ qùguo Běijīng. → Wǒ qù guo Běijīng. |  |
| s:l1:core:040 | 你坐过飞机吗？ | Nǐ zuòguo fēijī ma? → Nǐ zuò guo fēijī ma? |  |
| s:l1:core:041 | 我没去过中国。 | Wǒ méi qùguo Zhōngguó. → Wǒ méi qù guo Zhōngguó. |  |
| s:l1:core:042 | 他来过我家两次。 | Tā láiguo wǒ jiā liǎng cì. → Tā lái guo wǒ jiā liǎng cì. |  |
| s:l2:009 | 因为下雨，所以我们没出去。 | Yīnwèi xiàyǔ, suǒyǐ wǒmen méi chūqù. → Yīnwèi xiàyǔ, suǒyǐ wǒmen méi chūqu. |  |
| s:l2:029 | 学生必须去上课。 | Xuéshēng bìxū qù shàngkè. → Xuésheng bìxū qù shàngkè. |  |
| s:l2:052 | 虽然他不是学生，但是他常常学习。 | Suīrán tā bú shì xuéshēng, dànshì tā chángcháng xuéxí. → Suīrán tā bú shì xuésheng, dànshì tā chángcháng xuéxí. |  |
| s:l2:056 | 只要天气好，我们就出去。 | Zhǐyào tiānqì hǎo, wǒmen jiù chūqù. → Zhǐyào tiānqì hǎo, wǒmen jiù chūqu. |  |
| s:l2:059 | 学生能够回答这个问题。 | Xuéshēng nénggòu huídá zhège wèntí. → Xuésheng nénggòu huídá zhège wèntí. |  |
| s:l2:074 | 他以为今天是星期五。 | Tā yǐwéi jīntiān shì xīngqīwǔ. → Tā yǐwéi jīntiān shì xīngqī wǔ. |  |
| s:l2:110 | 他病了，只能在家休息。 | Tā bìng le, zhǐnéng zài jiā xiūxi. → Tā bìng le, zhǐnéng zàijiā xiūxi. |  |
| s:l2:132 | 妈妈就要回来了。 | Māma jiùyào huílái le. → Māma jiùyào huílai le. |  |
| s:l2:135 | 她认识很多人，比如老师、学生。 | Tā rènshi hěn duō rén, bǐrú lǎoshī, xuéshēng. → Tā rènshi hěn duō rén, bǐrú lǎoshī, xuésheng. |  |
| s:l2:145 | 老师很关心学生。 | Lǎoshī hěn guānxīn xuéshēng. → Lǎoshī hěn guānxīn xuésheng. |  |
| s:l2:165 | 这本书交给你了。 | Zhè běn shū jiāo gěi nǐ le. → Zhè běn shū jiāogěi nǐ le. |  |
| s:l2:166 | 这件事交给我吧。 | Zhè jiàn shì jiāo gěi wǒ ba. → Zhè jiàn shì jiāogěi wǒ ba. |  |
| s:l2:167 | 钱交给你了。 | Qián jiāo gěi nǐ le. → Qián jiāogěi nǐ le. |  |
| s:l2:168 | 这个工作交给他做。 | Zhège gōngzuò jiāo gěi tā zuò. → Zhège gōngzuò jiāogěi tā zuò. |  |
| s:l2:171 | 看到照片，我想起了那天。 | Kàndào zhàopiàn, wǒ xiǎngqǐ le nèi tiān. → Kàndào zhàopiàn, wǒ xiǎngqǐ le nà tiān. |  |
| s:l2:202 | 以下问题都不用回答。 | Yǐxià wèntí dōu bú yòng huídá. → Yǐxià wèntí dōu búyòng huídá. |  |
| s:l2:204 | 五岁以下的孩子不用买票。 | Wǔ suì yǐxià de háizi bú yòng mǎi piào. → Wǔ suì yǐxià de háizi búyòng mǎi piào. |  |
| s:l2:205 | 你忙的话，就不用来了。 | Nǐ máng dehuà, jiù bú yòng lái le. → Nǐ máng dehuà, jiù búyòng lái le. |  |
| s:l2:277 | 他忽然站起来了。 | Tā hūrán zhàn qǐlái le. → Tā hūrán zhàn qǐlai le. |  |
| s:l2:316 | 请走进来。 | Qǐng zǒu jìnlái. → Qǐng zǒujìn lái. |  |
| s:l2:333 | 我只有一点点钱。 | Wǒ zhǐyǒu yìdiǎndiǎn qián. → Wǒ zhǐ yǒu yìdiǎndiǎn qián. |  |
| s:l2:335 | 只有一点点了。 | Zhǐyǒu yìdiǎndiǎn le. → Zhǐ yǒu yìdiǎndiǎn le. |  |
| s:l2:337 | 我见过他。 | Wǒ jiàn guo tā. → Wǒ jiànguo tā. |  |
| s:l2:361 | 我是三年级学生。 | Wǒ shì sān niánjí xuéshēng. → Wǒ shì sān niánjí xuésheng. |  |
| s:l2:core:013 | 这些水果是谁带来的？ | Zhèxiē shuǐguǒ shì shéi dàilai de? → Zhèxiē shuǐguǒ shì shéi dàilái de? |  |
| s:l2:core:014 | 这个杯子我是从中国带来的。 | Zhège bēizi wǒ shì cóng Zhōngguó dàilai de. → Zhège bēizi wǒ shì cóng Zhōngguó dàilái de. |  |
| s:l2:fill:094 | 我的钱不够。 | Wǒ de qián bú gòu. → Wǒ de qián búgòu. |  |
| s:l3:013 | 我只是问问，没有别的意思。 | Wǒ zhǐshì wènwen, méiyǒu bié de yìsi. → Wǒ zhǐshì wènwen, méiyǒu biéde yìsi. |  |
| s:l3:015 | 这只是一个开始。 | Zhè zhǐshì yī gè kāishǐ. → Zhè zhǐshì yí ge kāishǐ. |  |
| s:l3:017 | 他连一句话都没说。 | Tā lián yī jù huà dōu méi shuō. → Tā lián yí jù huà dōu méi shuō. |  |
| s:l3:039 | 除了看书，我还喜欢运动。 | Chúle kànshū, wǒ hái xǐhuan yùndòng. → Chúle kàn shū, wǒ hái xǐhuan yùndòng. |  |
| s:l3:041 | 除了工作，他还要照顾孩子。 | Chúle gōngzuò, tā hái yào zhàogù háizi. → Chúle gōngzuò, tā hái yào zhàogu háizi. |  |
| s:l3:042 | 他突然站起来了。 | Tā tūrán zhàn qǐlái le. → Tā tūrán zhàn qǐlai le. |  |
| s:l3:048 | 我曾经去过北京。 | Wǒ céngjīng qùguo Běijīng. → Wǒ céngjīng qù guo Běijīng. |  |
| s:l3:049 | 他曾经是一名老师。 | Tā céngjīng shì yī míng lǎoshī. → Tā céngjīng shì yì míng lǎoshī. |  |
| s:l3:050 | 她曾经学过汉语。 | Tā céngjīng xuéguo Hànyǔ. → Tā céngjīng xué guo Hànyǔ. |  |
| s:l3:058 | 他一直写下去。 | Tā yīzhí xiě xiàqù. → Tā yìzhí xiě xiàqù. |  |
| s:l3:063 | 首先介绍一下儿自己，然后回答问题。 | Shǒuxiān jièshào yīxiàr zìjǐ, ránhòu huídá wèntí. → Shǒuxiān jièshào yíxiàr zìjǐ, ránhòu huídá wèntí. |  |
| s:l3:064 | 首先洗手，然后吃饭。 | Shǒuxiān xǐ shǒu, ránhòu chīfàn. → Shǒuxiān xǐ shǒu, ránhòu chīfàn. | đổi token: 首先 洗 手 然后 吃 饭 → 首先 洗 手 然后 吃饭 |
| s:l3:067 | 我们至少要练习一个小时。 | Wǒmen zhìshǎo yào liànxí yī gè xiǎoshí. → Wǒmen zhìshǎo yào liànxí yí ge xiǎoshí. |  |
| s:l3:068 | 大雨造成了很多问题。 | Dàyǔ zàochéng le hěn duō wèntí. → Dà yǔ zàochéng le hěn duō wèntí. |  |
| s:l3:074 | 面对困难，他一直很努力。 | Miànduì kùnnan, tā yīzhí hěn nǔlì. → Miànduì kùnnan, tā yìzhí hěn nǔlì. |  |
| s:l3:085 | 这仅仅是一个开始。 | Zhè jǐnjǐn shì yī gè kāishǐ. → Zhè jǐnjǐn shì yí ge kāishǐ. |  |
| s:l3:086 | 这件事仅他一个人知道。 | Zhè jiàn shì jǐn tā yī gè rén zhīdào. → Zhè jiàn shì jǐn tā yí ge rén zhīdào. |  |
| s:l3:089 | 这本来不是问题。 | Zhè běnlái bù shì wèntí. → Zhè běnlái bú shì wèntí. |  |
| s:l3:092 | 难道这不是真的吗？ | Nándào zhè bù shì zhēnde ma? → Nándào zhè bú shì zhēnde ma? |  |
| s:l3:101 | 我从来没去过中国。 | Wǒ cónglái méi qùguo Zhōngguó. → Wǒ cónglái méi qù guo Zhōngguó. |  |
| s:l3:109 | 要是明天下雨，我们就不去了。 | Yàoshi míngtiān xiàyǔ, wǒmen jiù bù qù le. → Yàoshi míngtiān xiàyǔ, wǒmen jiù bú qù le. |  |
| s:l3:117 | 这个结果显然不对。 | Zhège jiéguǒ xiǎnrán bù duì. → Zhège jiéguǒ xiǎnrán bú duì. |  |
| s:l3:120 | 时间不够，我不得不快点走了。 | Shíjiān bù gòu, wǒ bùdébù kuài diǎn zǒu le. → Shíjiān bú gòu, wǒ bùdébù kuài diǎn zǒu le. |  |
| s:l3:127 | 事实上，他没有去过北京。 | Shìshí shang, tā méiyǒu qùguo Běijīng. → Shìshí shang, tā méiyǒu qù guo Běijīng. |  |
| s:l3:129 | 事实上，他一直很努力。 | Shìshí shang, tā yīzhí hěn nǔlì. → Shìshí shang, tā yìzhí hěn nǔlì. |  |
| s:l3:143 | 他简直不敢相信。 | Tā jiǎnzhí bùgǎn xiāngxìn. → Tā jiǎnzhí bù gǎn xiāngxìn. |  |
| s:l3:145 | 反正我不去。 | Fǎnzhèng wǒ bù qù. → Fǎnzhèng wǒ bú qù. |  |
| s:l3:146 | 你说什么都没用，反正他不会同意。 | Nǐ shuō shénme dōu méi yòng, fǎnzhèng tā bù huì tóngyì. → Nǐ shuō shénme dōu méi yòng, fǎnzhèng tā bú huì tóngyì. |  |
| s:l3:150 | 时间不够，恐怕我们去不了了。 | Shíjiān bù gòu, kǒngpà wǒmen qù bu liǎo le. → Shíjiān bú gòu, kǒngpà wǒmen qù bu liǎo le. |  |
| s:l3:177 | 我把这个故事写成了一本书。 | Wǒ bǎ zhège gùshi xiě chéng le yī běn shū. → Wǒ bǎ zhège gùshi xiě chéng le yì běn shū. |  |
| s:l3:199 | 不论多忙，他都会运动。 | Bùlùn duō máng, tā dōu huì yùndòng. → Búlùn duō máng, tā dōu huì yùndòng. |  |
| s:l3:200 | 不论谁问，我都不会说。 | Bùlùn shéi wèn, wǒ dōu bù huì shuō. → Búlùn shéi wèn, wǒ dōu bú huì shuō. |  |
| s:l3:201 | 不论去哪里，他都带着这本书。 | Bùlùn qù nǎlǐ, tā dōu dàizhe zhè běn shū. → Búlùn qù nǎlǐ, tā dōu dài zhe zhè běn shū. |  |
| s:l3:208 | 他看起来很累。 | Tā kàn qǐlái hěn lèi. → Tā kàn qǐlai hěn lèi. |  |
| s:l3:209 | 这个菜看上去很好吃。 | Zhège cài kàn shàngqù hěn hǎochī. → Zhège cài kàn shangqu hěn hǎochī. |  |
| s:l3:210 | 她看起来比以前年轻。 | Tā kàn qǐlái bǐ yǐqián niánqīng. → Tā kàn qǐlai bǐ yǐqián niánqīng. |  |
| s:l3:219 | 他站住不动了。 | Tā zhàn zhù bù dòng le. → Tā zhàn zhù bú dòng le. |  |
| s:l3:220 | 天气冷起来了。 | Tiānqì lěng qǐlái le. → Tiānqì lěng qǐlai le. |  |
| s:l3:221 | 大家都笑了起来。 | Dàjiā dōu xiào le qǐlái. → Dàjiā dōu xiào le qǐlai. |  |
| s:l3:222 | 他忙起来就忘了吃饭。 | Tā máng qǐlái jiù wàng le chīfàn. → Tā máng qǐlai jiù wàng le chīfàn. |  |
| s:l3:235 | 他一到家就打电话给我。 | Tā yī dào jiā jiù dǎ diànhuà gěi wǒ. → Tā yí dào jiā jiù dǎ diànhuà gěi wǒ. |  |
| s:l3:236 | 我一看就明白了。 | Wǒ yī kàn jiù míngbai le. → Wǒ yí kàn jiù míngbai le. |  |
| s:l3:237 | 她一说完就走了。 | Tā yī shuō wán jiù zǒu le. → Tā yì shuō wán jiù zǒu le. |  |
| s:l3:243 | 这是我所知道的一切。 | Zhè shì wǒ suǒ zhīdào de yīqiè. → Zhè shì wǒ suǒ zhīdào de yíqiè. |  |
| s:l3:245 | 这不是我所希望的结果。 | Zhè bù shì wǒ suǒ xīwàng de jiéguǒ. → Zhè bú shì wǒ suǒ xīwàng de jiéguǒ. |  |
| s:l3:247 | 他们整整走了一天。 | Tāmen zhěngzhěng zǒu le yī tiān. → Tāmen zhěngzhěng zǒu le yì tiān. |  |
| s:l3:254 | 她早已不是学生了。 | Tā zǎoyǐ bù shì xuésheng le. → Tā zǎoyǐ bú shì xuésheng le. |  |
| s:l3:255 | 一方面他想休息，另一方面他还有很多工作。 | Yī fāngmiàn tā xiǎng xiūxi, lìng yī fāngmiàn tā hái yǒu hěn duō gōngzuò. → Yì fāngmiàn tā xiǎng xiūxi, lìng yì fāngmiàn tā hái yǒu hěn duō gōngzuò. |  |
| s:l3:256 | 一方面我喜欢这个城市，另一方面这里的房子太贵了。 | Yī fāngmiàn wǒ xǐhuan zhège chéngshì, lìng yī fāngmiàn zhèlǐ de fángzi tài guì le. → Yì fāngmiàn wǒ xǐhuan zhège chéngshì, lìng yì fāngmiàn zhèlǐ de fángzi tài guì le. |  |
| s:l3:257 | 一方面他很努力，另一方面他也很幸运。 | Yī fāngmiàn tā hěn nǔlì, lìng yī fāngmiàn tā yě hěn xìngyùn. → Yì fāngmiàn tā hěn nǔlì, lìng yì fāngmiàn tā yě hěn xìngyùn. |  |
| s:l3:263 | 时间必然会改变一切。 | Shíjiān bìrán huì gǎibiàn yīqiè. → Shíjiān bìrán huì gǎibiàn yíqiè. |  |
| s:l3:268 | 这次比赛共有一百人参加。 | Zhè cì bǐsài gòngyǒu yī bǎi rén cānjiā. → Zhè cì bǐsài gòngyǒu yì bǎi rén cānjiā. |  |
| s:l3:280 | 这个工作将近一年了。 | Zhège gōngzuò jiāngjìn yī nián le. → Zhège gōngzuò jiāngjìn yì nián le. |  |
| s:l3:281 | 将近一百人参加了这次比赛。 | Jiāngjìn yī bǎi rén cānjiā le zhè cì bǐsài. → Jiāngjìn yì bǎi rén cānjiā le zhè cì bǐsài. |  |
| s:l3:283 | 看见老师，他连忙站了起来。 | Kànjiàn lǎoshī, tā liánmáng zhàn le qǐlái. → Kànjiàn lǎoshī, tā liánmáng zhàn le qǐlai. |  |
| s:l3:291 | 你千万不要忘了。 | Nǐ qiānwàn bùyào wàng le. → Nǐ qiānwàn búyào wàng le. |  |
| s:l3:297 | 这份工作具有一定的危险。 | Zhè fèn gōngzuò jùyǒu yīdìng de wēixiǎn. → Zhè fèn gōngzuò jùyǒu yídìng de wēixiǎn. |  |
| s:l3:299 | 大约有一百人参加了这次比赛。 | Dàyuē yǒu yī bǎi rén cānjiā le zhè cì bǐsài. → Dàyuē yǒu yì bǎi rén cānjiā le zhè cì bǐsài. |  |
| s:l3:312 | 预计会有一千人参加。 | Yùjì huì yǒu yī qiān rén cānjiā. → Yùjì huì yǒu yì qiān rén cānjiā. |  |
| s:l3:320 | 你走开！ | Nǐ zǒu kāi! → Nǐ zǒukāi! |  |
| s:l3:331 | 她从包里拿出了一本书。 | Tā cóng bāo lǐ ná chū le yī běn shū. → Tā cóng bāo lǐ náchū le yì běn shū. |  |
| s:l3:fix:012 | 大雪造成很多人不能回家。 | Dàxuě zàochéng hěn duō rén bù néng huíjiā. → Dà xuě zàochéng hěn duō rén bù néng huíjiā. |  |
| s:l3:fix:024 | 我的头又痛起来了。 | Wǒ de tóu yòu tòng qǐlái le. → Wǒ de tóu yòu tòng qǐlai le. |  |
| s:l3:fix:025 | 休息了一会儿，他精神起来了。 | Xiūxi le yíhuìr, tā jīngshen qǐlái le. → Xiūxi le yíhuìr, tā jīngshen qǐlai le. |  |
| s:l3:fill:002 | 我感冒了，想在家休息。 | Wǒ gǎnmào le, xiǎng zài jiā xiūxi. → Wǒ gǎnmào le, xiǎng zàijiā xiūxi. |  |
| s:l3:fill:063 | 这个问题值得关注。 | Zhège wèntí zhíde guānzhù. → Zhège wèntí zhídé guānzhù. |  |
