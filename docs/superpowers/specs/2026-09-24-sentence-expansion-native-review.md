# Sentence expansion — native-speaker review list

Spec: `2026-09-24-sentence-expansion-design.md`. AI-written. Mark a row in the last
column when a sentence is unnatural, mistranslated, or misread.

## Uncovered-word allowlist

| Word | Reason | Note |
|---|---|---|

## Existing sentences fixed while writing

| Id | Before → after | Note |
|---|---|---|
| s:l1:fill:046 | vi: Tôi khỏe, anh ấy cũng khỏe. → Tôi khỏe, anh ấy khỏe. | "cũng" has no 也 in the Chinese (Task 2 review) |
| s:l1:fill:054 | vi: Xin lỗi, tôi chưa đóng. → Xin lỗi, tôi không đóng. | 没 here is a past negation, not "chưa" (Task 2 review) |
| s:l2:fill:262 | pinyin: Xī'nán hé xīběi… → Xīnán hé Xīběi… | region names capitalised like 东北 Dōngběi (s:l2:fill:259); no apostrophe needed before n (Task 4 deferred item) |

## L1

| Id | Chinese | Pinyin | Vietnamese | Note |
|---|---|---|---|---|
| s:l1:fill:045 | 你好，你好！ | Nǐ hǎo, nǐ hǎo! | Chào bạn, chào bạn! |  |
| s:l1:fill:046 | 我好，他好。 | Wǒ hǎo, tā hǎo. | Tôi khỏe, anh ấy khỏe. |  |
| s:l1:fill:047 | 对，谢谢你！ | Duì, xièxie nǐ! | Đúng rồi, cảm ơn bạn! |  |
| s:l1:fill:048 | 我不再见他。 | Wǒ bú zài jiàn tā. | Tôi sẽ không gặp anh ấy nữa. |  |
| s:l1:fill:049 | 谢谢您，再见！ | Xièxie nín, zàijiàn! | Cảm ơn ông, tạm biệt! |  |
| s:l1:fill:050 | 您对，我不对。 | Nín duì, wǒ bú duì. | Ông nói đúng, tôi sai. |  |
| s:l1:fill:051 | 先生，您叫什么名字？ | Xiānsheng, nín jiào shénme míngzi? | Thưa ông, ông tên là gì ạ? |  |
| s:l1:fill:052 | 您先请！ | Nín xiān qǐng! | Mời ông đi trước ạ! |  |
| s:l1:fill:053 | 小姐，你认识他吗？ | Xiǎojie, nǐ rènshi tā ma? | Cô ơi, cô có quen anh ấy không? |  |
| s:l1:fill:054 | 对不起，我没关。 | Duìbuqǐ, wǒ méi guān. | Xin lỗi, tôi không đóng. |  |
| s:l1:fill:055 | 对不起，我不认识她。 | Duìbuqǐ, wǒ bú rènshi tā. | Xin lỗi, tôi không quen cô ấy. |  |
| s:l1:fill:056 | 没关系，您坐。 | Méi guānxi, nín zuò. | Không sao đâu, ông cứ ngồi. |  |
| s:l1:fill:057 | 你问他什么？ | Nǐ wèn tā shénme? | Bạn hỏi anh ấy cái gì? |  |
| s:l1:fill:058 | 没什么，您请进。 | Méi shénme, nín qǐngjìn. | Không sao đâu, mời ông vào. |  |
| s:l1:fill:059 | 您好，请进！请坐！ | Nín hǎo, qǐngjìn! Qǐngzuò! | Chào ông, mời vào! Mời ngồi! |  |
| s:l1:fill:060 | 你朋友真好！ | Nǐ péngyou zhēn hǎo! | Bạn của bạn tốt thật! |  |
| s:l1:fill:061 | 我不太认识她。 | Wǒ bú tài rènshi tā. | Tôi không quen cô ấy lắm. |  |
| s:l1:fill:062 | 爸，你也认识他吗？ | Bà, nǐ yě rènshi tā ma? | Bố ơi, bố cũng quen chú ấy ạ? |  |
| s:l1:fill:063 | 妈，谢谢您！ | Mā, xièxie nín! | Con cảm ơn mẹ! |  |
| s:l1:fill:064 | 哥，你认识她吗？ | Gē, nǐ rènshi tā ma? | Anh ơi, anh có quen chị ấy không? |  |
| s:l1:fill:065 | 我妹也认识他。 | Wǒ mèi yě rènshi tā. | Em gái tôi cũng quen anh ấy. |  |
| s:l1:fill:066 | 我爷爷奶奶都很好。 | Wǒ yéye nǎinai dōu hěn hǎo. | Ông bà tôi đều khỏe. |  |
| s:l1:fill:067 | 奶奶，您请坐！ | Nǎinai, nín qǐngzuò! | Bà ơi, bà ngồi đi ạ! |  |
| s:l1:fill:068 | 她是你女朋友吗？ | Tā shì nǐ nǚ péngyou ma? | Cô ấy là bạn gái của bạn à? |  |
| s:l1:fill:069 | 一二三四，二二三四！ | Yī èr sān sì, èr èr sān sì! | Một hai ba bốn, hai hai ba bốn! |  |
| s:l1:fill:070 | 二二三四，五六七八！ | Èr èr sān sì, wǔ liù qī bā! | Hai hai ba bốn, năm sáu bảy tám! |  |
| s:l1:fill:071 | 三，二，一，零！ | Sān, èr, yī, líng! | Ba, hai, một, không! |  |
| s:l1:fill:072 | 我爷爷九十，我奶奶八十。 | Wǒ yéye jiǔshí, wǒ nǎinai bāshí. | Ông tôi chín mươi tuổi, bà tôi tám mươi. |  |
| s:l1:fill:073 | 请问，几个人？ | Qǐngwèn, jǐ ge rén? | Xin hỏi, mấy người ạ? |  |
| s:l1:fill:074 | 老先生，您请坐。 | Lǎo xiānsheng, nín qǐngzuò. | Thưa cụ, mời cụ ngồi. |  |
| s:l1:fill:075 | 你的朋友是男的吗？ | Nǐ de péngyou shì nán de ma? | Bạn của bạn là con trai à? |  |
| s:l1:fill:076 | 他是一个好男人。 | Tā shì yí ge hǎo nánrén. | Anh ấy là một người đàn ông tốt. |  |
| s:l1:fill:077 | 别问女人多大。 | Bié wèn nǚrén duō dà. | Đừng hỏi tuổi phụ nữ. |  |
| s:l1:fill:078 | 他有一子一女。 | Tā yǒu yì zǐ yì nǚ. | Anh ấy có một con trai và một con gái. |  |
| s:l1:fill:079 | 他还在吗？ | Tā hái zài ma? | Anh ấy vẫn còn ở đó chứ? |  |
| s:l1:fill:080 | 我在家最小。 | Wǒ zài jiā zuì xiǎo. | Ở nhà tôi là người nhỏ nhất. |  |
| s:l1:fill:081 | 他家非常大。 | Tā jiā fēicháng dà. | Nhà anh ấy rất rộng. |  |
| s:l1:fill:082 | 我家不大，人不少。 | Wǒ jiā búdà, rén bù shǎo. | Nhà tôi không rộng nhưng đông người. |  |
| s:l1:fill:083 | 我跟你一样大。 | Wǒ gēn nǐ yíyàng dà. | Tôi bằng tuổi bạn. |  |
| s:l1:fill:084 | 哪些是你的？ | Nǎxiē shì nǐ de? | Những cái nào là của bạn? |  |
| s:l1:fill:085 | 我认识他的一些朋友。 | Wǒ rènshi tā de yìxiē péngyou. | Tôi quen vài người bạn của anh ấy. |  |
| s:l1:fill:086 | 那些人，有些我认识。 | Nàxiē rén, yǒuxiē wǒ rènshi. | Trong những người kia, có vài người tôi quen. |  |
| s:l1:fill:087 | 你家在哪里？ | Nǐ jiā zài nǎlǐ? | Nhà bạn ở đâu? |  |
| s:l1:fill:088 | 他家在那边。 | Tā jiā zài nàbian. | Nhà anh ấy ở đằng kia. |  |
| s:l1:fill:089 | 这里是什么地方？ | Zhèlǐ shì shénme dìfang? | Đây là chỗ nào vậy? |  |
| s:l1:fill:090 | 前天我在家。 | Qiántiān wǒ zài jiā. | Hôm kia tôi ở nhà. |  |
| s:l1:fill:091 | 我们后天在那儿见。 | Wǒmen hòutiān zài nàr jiàn. | Ngày kia chúng ta gặp nhau ở đó. |  |
| s:l1:fill:092 | 今天是一月一日。 | Jīntiān shì yī yuè yī rì. | Hôm nay là ngày 1 tháng 1. |  |
| s:l1:fill:093 | 日期不对。 | Rìqī bú duì. | Ngày tháng không đúng. |  |
| s:l1:fill:094 | 明天是我的生日。 | Míngtiān shì wǒ de shēngrì. | Ngày mai là sinh nhật tôi. |  |
| s:l1:fill:095 | 星期日你在家吗？ | Xīngqīrì nǐ zài jiā ma? | Chủ nhật bạn có ở nhà không? |  |
| s:l1:fill:096 | 这是我的新朋友。 | Zhè shì wǒ de xīn péngyou. | Đây là bạn mới của tôi. |  |
| s:l1:fill:097 | 我们明年再见！ | Wǒmen míngnián zàijiàn! | Hẹn gặp lại vào năm sau nhé! |  |
| s:l1:fill:098 | 我一个星期去两次。 | Wǒ yí ge xīngqī qù liǎng cì. | Mỗi tuần tôi đi hai lần. |  |
| s:l1:fill:099 | 你是第几次去那儿？ | Nǐ shì dì jǐ cì qù nàr? | Đây là lần thứ mấy bạn đến đó? |  |
| s:l1:fill:100 | 他早上不在家。 | Tā zǎoshang bú zài jiā. | Buổi sáng anh ấy không có ở nhà. |  |
| s:l1:fill:101 | 明天早上见！ | Míngtiān zǎoshang jiàn! | Sáng mai gặp nhé! |  |
| s:l1:fill:102 | 我上午在家，下午不在。 | Wǒ shàngwǔ zài jiā, xiàwǔ bú zài. | Buổi sáng tôi ở nhà, buổi chiều thì không. |  |
| s:l1:fill:103 | 我们八点十分见。 | Wǒmen bā diǎn shí fēn jiàn. | Chúng ta gặp nhau lúc tám giờ mười phút. |  |
| s:l1:fill:104 | 你什么时候去？ | Nǐ shénme shíhou qù? | Khi nào bạn đi? |  |
| s:l1:fill:105 | 我们一会儿见！ | Wǒmen yíhuìr jiàn! | Lát nữa gặp nhé! |  |
| s:l1:fill:106 | 他有时候在家，有时候不在。 | Tā yǒushíhou zài jiā, yǒushíhou bú zài. | Anh ấy lúc thì ở nhà, lúc thì không. |  |
| s:l1:fill:107 | 我有时早上去。 | Wǒ yǒushí zǎoshang qù. | Thỉnh thoảng tôi đi vào buổi sáng. |  |
| s:l1:fill:108 | 现在正是时候。 | Xiànzài zhèng shì shíhou. | Bây giờ là đúng lúc. |  |
| s:l1:fill:109 | 星期天我常常在家。 | Xīngqītiān wǒ chángcháng zài jiā. | Chủ nhật tôi thường ở nhà. |  |
| s:l1:fill:110 | 上次谢谢你！ | Shàngcì xièxie nǐ! | Cảm ơn bạn chuyện lần trước nhé! |  |
| s:l1:fill:111 | 我们一人一半。 | Wǒmen yì rén yíbàn. | Chúng ta mỗi người một nửa. |  |
| s:l1:fill:112 | 我们一块儿去。 | Wǒmen yíkuàir qù. | Chúng ta cùng đi nhé. |  |
| s:l1:fill:113 | 还差一个人。 | Hái chà yí ge rén. | Còn thiếu một người. |  |
| s:l1:fill:114 | 我儿子不喝奶。 | Wǒ érzi bù hē nǎi. | Con trai tôi không uống sữa. |  |
| s:l1:fill:115 | 你们喝茶吗？ | Nǐmen hē chá ma? | Các bạn có uống trà không? |  |
| s:l1:fill:116 | 我不吃肉。 | Wǒ bù chī ròu. | Tôi không ăn thịt. |  |
| s:l1:fill:117 | 他们在吃饭。 | Tāmen zài chīfàn. | Họ đang ăn cơm. |  |
| s:l1:fill:118 | 这个菜很好吃。 | Zhège cài hěn hǎochī. | Món này rất ngon. |  |
| s:l1:fill:119 | 你渴不渴？ | Nǐ kě bu kě? | Bạn có khát không? |  |
| s:l1:fill:120 | 我早上吃面包和鸡蛋。 | Wǒ zǎoshang chī miànbāo hé jīdàn. | Buổi sáng tôi ăn bánh mì và trứng. |  |
| s:l1:fill:121 | 你吃几个包子？ | Nǐ chī jǐ ge bāozi? | Bạn ăn mấy cái bánh bao? |  |
| s:l1:fill:122 | 这是谁的杯子？ | Zhè shì shéi de bēizi? | Đây là cốc của ai? |  |
| s:l1:fill:123 | 我送你。 | Wǒ sòng nǐ. | Để tôi tiễn bạn. |  |
| s:l1:fill:124 | 请放在这儿。 | Qǐng fàng zài zhèr. | Cứ để ở đây nhé. |  |
| s:l1:fill:125 | 他还在床上。 | Tā hái zài chuáng shàng. | Anh ấy vẫn còn nằm trên giường. |  |
| s:l1:fill:126 | 这个动作不对。 | Zhège dòngzuò bú duì. | Động tác này không đúng. |  |
| s:l1:fill:127 | 请问，洗手间在哪儿？ | Qǐngwèn, xǐshǒujiān zài nǎr? | Xin hỏi, nhà vệ sinh ở đâu? |  |
| s:l1:fill:128 | 你先洗手。 | Nǐ xiān xǐ shǒu. | Con rửa tay trước đi. |  |
| s:l1:fill:129 | 你别关上，我还要用。 | Nǐ bié guānshàng, wǒ hái yào yòng. | Bạn đừng đóng lại, tôi còn phải dùng. |  |
| s:l1:fill:130 | 你家有几口人？ | Nǐ jiā yǒu jǐ kǒu rén? | Nhà bạn có mấy người? |  |
| s:l1:fill:131 | 你身体好吗？ | Nǐ shēntǐ hǎo ma? | Bạn có khỏe không? |  |
| s:l1:fill:132 | 今天有一些冷。 | Jīntiān yǒu yìxiē lěng. | Hôm nay hơi lạnh. |  |
| s:l1:fill:133 | 我哥哥是医生。 | Wǒ gēge shì yīshēng. | Anh trai tôi là bác sĩ. |  |
| s:l1:fill:134 | 这间房间很大。 | Zhè jiān fángjiān hěn dà. | Căn phòng này rất rộng. |  |
| s:l1:fill:135 | 我住在楼下。 | Wǒ zhù zài lóuxià. | Tôi sống ở tầng dưới. |  |
| s:l1:fill:136 | 桌子上有一杯茶。 | Zhuōzi shàng yǒu yì bēi chá. | Trên bàn có một cốc trà. |  |
| s:l1:fill:137 | 哪儿是北？ | Nǎr shì běi? | Đâu là hướng bắc? |  |
| s:l1:fill:138 | 上边是我的房间。 | Shàngbian shì wǒ de fángjiān. | Phía trên là phòng của tôi. |  |
| s:l1:fill:139 | 你的包在桌子下边。 | Nǐ de bāo zài zhuōzi xiàbian. | Túi của bạn ở dưới gầm bàn. |  |
| s:l1:fill:140 | 我家西边有一个饭店。 | Wǒ jiā xībiān yǒu yí ge fàndiàn. | Phía tây nhà tôi có một nhà hàng. |  |
| s:l1:fill:141 | 饭店在医院南边。 | Fàndiàn zài yīyuàn nánbian. | Nhà hàng ở phía nam bệnh viện. |  |
| s:l1:fill:142 | 北边的房间很冷。 | Běibiān de fángjiān hěn lěng. | Căn phòng phía bắc rất lạnh. |  |
| s:l1:fill:143 | 今天吃饭的地点在哪儿？ | Jīntiān chīfàn de dìdiǎn zài nǎr? | Hôm nay ăn cơm ở địa điểm nào? |  |
| s:l1:fill:144 | 别在马路上跑。 | Bié zài mǎlù shàng pǎo. | Đừng chạy ngoài đường. |  |
| s:l1:fill:145 | 不远，我们走路去。 | Bù yuǎn, wǒmen zǒulù qù. | Không xa đâu, chúng ta đi bộ. |  |
| s:l1:fill:146 | 请给我看一下儿地图。 | Qǐng gěi wǒ kàn yíxiàr dìtú. | Cho tôi xem bản đồ một chút. |  |
| s:l1:fill:147 | 你几点飞？ | Nǐ jǐ diǎn fēi? | Mấy giờ bạn bay? |  |
| s:l1:fill:148 | 我们在这里上车。 | Wǒmen zài zhèlǐ shàngchē. | Chúng ta lên xe ở đây. |  |
| s:l1:fill:149 | 我坐汽车去医院。 | Wǒ zuò qìchē qù yīyuàn. | Tôi đi ô tô đến bệnh viện. |  |
| s:l1:fill:150 | 我们在车站下车。 | Wǒmen zài chēzhàn xiàchē. | Chúng ta xuống xe ở bến. |  |
| s:l1:fill:151 | 我在车上睡觉。 | Wǒ zài chēshàng shuìjiào. | Tôi ngủ trên xe. |  |
| s:l1:fill:152 | 你的车票呢？ | Nǐ de chēpiào ne? | Vé xe của bạn đâu? |  |
| s:l1:fill:153 | 我不想回去。 | Wǒ bù xiǎng huíqu. | Tôi không muốn về. |  |
| s:l1:fill:154 | 你出来一下儿。 | Nǐ chūlái yíxiàr. | Bạn ra đây một chút. |  |
| s:l1:fill:155 | 你们先进去。 | Nǐmen xiān jìnqù. | Các bạn vào trước đi. |  |
| s:l1:fill:156 | 他是我的同学。 | Tā shì wǒ de tóngxué. | Cậu ấy là bạn học của tôi. |  |
| s:l1:fill:157 | 我们下午四点下课。 | Wǒmen xiàwǔ sì diǎn xiàkè. | Bốn giờ chiều chúng tôi tan học. |  |
| s:l1:fill:158 | 我弟弟上小学。 | Wǒ dìdi shàng xiǎoxué. | Em trai tôi học tiểu học. |  |
| s:l1:fill:159 | 我妹妹今年上中学。 | Wǒ mèimei jīnnián shàng zhōngxué. | Năm nay em gái tôi lên trung học. |  |
| s:l1:fill:160 | 你读，我写。 | Nǐ dú, wǒ xiě. | Bạn đọc, tôi viết. |  |
| s:l1:fill:161 | 你在写什么？ | Nǐ zài xiě shénme? | Bạn đang viết gì vậy? |  |
| s:l1:fill:162 | 明天考什么？ | Míngtiān kǎo shénme? | Ngày mai thi môn gì? |  |
| s:l1:fill:163 | 我能试一下儿吗？ | Wǒ néng shì yíxiàr ma? | Tôi thử một chút được không? |  |
| s:l1:fill:164 | 书里有很多知识。 | Shū lǐ yǒu hěn duō zhīshi. | Trong sách có rất nhiều kiến thức. |  |
| s:l1:fill:165 | 我哥哥在这个学院学习。 | Wǒ gēge zài zhège xuéyuàn xuéxí. | Anh trai tôi học ở học viện này. |  |
| s:l1:fill:166 | 教学楼在学校后边。 | Jiàoxuélóu zài xuéxiào hòubian. | Tòa nhà giảng đường ở phía sau trường. |  |
| s:l1:fill:167 | 请听我说。 | Qǐng tīng wǒ shuō. | Xin hãy nghe tôi nói. |  |
| s:l1:fill:168 | 你会说什么外语？ | Nǐ huì shuō shénme wàiyǔ? | Bạn biết nói ngoại ngữ nào? |  |
| s:l1:fill:169 | 别忘了我的生日。 | Bié wàng le wǒ de shēngrì. | Đừng quên sinh nhật của tôi. |  |
| s:l1:fill:170 | 我忘记他的名字了。 | Wǒ wàngjì tā de míngzi le. | Tôi quên tên anh ấy rồi. |  |
| s:l1:fill:171 | 我六点下班。 | Wǒ liù diǎn xiàbān. | Tôi tan làm lúc sáu giờ. |  |
| s:l1:fill:172 | 我妈妈在医院工作。 | Wǒ māma zài yīyuàn gōngzuò. | Mẹ tôi làm việc ở bệnh viện. |  |
| s:l1:fill:173 | 孩子们放学了。 | Háizimen fàngxué le. | Bọn trẻ tan học rồi. |  |
| s:l1:fill:174 | 他爸爸是工人。 | Tā bàba shì gōngrén. | Bố cậu ấy là công nhân. |  |
| s:l1:fill:175 | 谢谢你来帮忙。 | Xièxie nǐ lái bāngmáng. | Cảm ơn bạn đã đến giúp. |  |
| s:l1:fill:176 | 我们明天去，行吗？ | Wǒmen míngtiān qù, xíng ma? | Mai chúng ta đi, được không? |  |
| s:l1:fill:177 | 没事儿，你去吧。 | Méi shìr, nǐ qù ba. | Không sao, bạn cứ đi đi. |  |
| s:l1:fill:178 | 我的手机没电了。 | Wǒ de shǒujī méi diàn le. | Điện thoại của tôi hết pin rồi. |  |
| s:l1:fill:179 | 我用电脑工作。 | Wǒ yòng diànnǎo gōngzuò. | Tôi làm việc bằng máy tính. |  |
| s:l1:fill:180 | 我们去电影院看电影吧。 | Wǒmen qù diànyǐngyuàn kàn diànyǐng ba. | Chúng mình đi rạp xem phim đi. |  |
| s:l1:fill:181 | 我家没有电视机。 | Wǒ jiā méiyǒu diànshìjī. | Nhà tôi không có tivi. |  |
| s:l1:fill:182 | 我在网上认识了一个网友。 | Wǒ zài wǎngshàng rènshi le yí ge wǎngyǒu. | Tôi quen một người bạn trên mạng. |  |
| s:l1:fill:183 | 一杯茶十五元。 | Yì bēi chá shíwǔ yuán. | Một cốc trà mười lăm tệ. |  |
| s:l1:fill:184 | 我们去商场买东西。 | Wǒmen qù shāngchǎng mǎi dōngxi. | Chúng tôi đi trung tâm thương mại mua đồ. |  |
| s:l1:fill:185 | 一个鸡蛋八毛钱。 | Yí ge jīdàn bā máo qián. | Một quả trứng tám hào. |  |
| s:l1:fill:186 | 这个书包很重。 | Zhège shūbāo hěn zhòng. | Cái cặp sách này rất nặng. |  |
| s:l1:fill:187 | 这个考试很重要。 | Zhège kǎoshì hěn zhòngyào. | Kỳ thi này rất quan trọng. |  |
| s:l1:fill:188 | 他走路很慢。 | Tā zǒulù hěn màn. | Anh ấy đi bộ rất chậm. |  |
| s:l1:fill:189 | 我的电脑坏了。 | Wǒ de diànnǎo huài le. | Máy tính của tôi hỏng rồi. |  |
| s:l1:fill:190 | 那个老人是我爷爷。 | Nàge lǎorén shì wǒ yéye. | Cụ già kia là ông nội tôi. |  |
| s:l1:fill:191 | 妈妈，我爱你！ | Māma, wǒ ài nǐ! | Mẹ ơi, con yêu mẹ! |  |
| s:l1:fill:192 | 这个地方很好玩儿。 | Zhège dìfang hěn hǎowánr. | Chỗ này rất vui. |  |
| s:l1:fill:193 | 你的爱好是什么？ | Nǐ de àihào shì shénme? | Sở thích của bạn là gì? |  |
| s:l1:fill:194 | 明天会下雨吗？ | Míngtiān huì xiàyǔ ma? | Ngày mai có mưa không? |  |
| s:l1:fill:195 | 山上有很多树。 | Shān shàng yǒu hěn duō shù. | Trên núi có rất nhiều cây. |  |
| s:l1:fill:196 | 我听见有人叫我。 | Wǒ tīngjiàn yǒu rén jiào wǒ. | Tôi nghe thấy có người gọi tôi. |  |
| s:l1:fill:197 | 我在电视上看到他了。 | Wǒ zài diànshì shàng kàndào tā le. | Tôi đã thấy anh ấy trên tivi. |  |
| s:l1:fill:198 | 你是不是生病了？ | Nǐ shì bu shì shēngbìng le? | Có phải bạn bị ốm rồi không? |  |
| s:l1:fill:199 | 有的好吃，有的不好吃。 | Yǒude hǎochī, yǒude bù hǎochī. | Có món ngon, có món không ngon. |  |
| s:l1:fill:200 | 他得到了一个新工作。 | Tā dédào le yí ge xīn gōngzuò. | Anh ấy có được một công việc mới. |  |
| s:l1:fill:201 | 那个女孩儿是谁？ | Nàge nǚháir shì shéi? | Cô bé kia là ai? |  |
| s:l1:fill:202 | 她有男朋友吗？ | Tā yǒu nánpéngyou ma? | Cô ấy có bạn trai không? |  |
| s:l1:fill:203 | 你找到你的手机了吗？ | Nǐ zhǎodào nǐ de shǒujī le ma? | Bạn đã tìm thấy điện thoại chưa? |  |
| s:l1:fill:204 | 我没找到图书馆。 | Wǒ méi zhǎodào túshūguǎn. | Tôi không tìm thấy thư viện. |  |

## L2

| Id | Chinese | Pinyin | Vietnamese | Note |
|---|---|---|---|---|
| s:l2:fill:205 | 我早上吃了两片面包。 | Wǒ zǎoshang chī le liǎng piàn miànbāo. | Sáng nay tôi ăn hai lát bánh mì. |  |
| s:l2:fill:206 | 这段时间我很忙。 | Zhè duàn shíjiān wǒ hěn máng. | Dạo này tôi rất bận. |  |
| s:l2:fill:207 | 他买了一套新衣服。 | Tā mǎi le yí tào xīn yīfu. | Anh ấy mua một bộ quần áo mới. |  |
| s:l2:fill:208 | 我们坐在第一排。 | Wǒmen zuò zài dì yī pái. | Chúng tôi ngồi ở hàng đầu tiên. |  |
| s:l2:fill:209 | 我为你高兴。 | Wǒ wèi nǐ gāoxìng. | Tôi mừng cho bạn. |  |
| s:l2:fill:210 | 这件衣服好看，但太贵了。 | Zhè jiàn yīfu hǎokàn, dàn tài guì le. | Chiếc áo này đẹp nhưng đắt quá. |  |
| s:l2:fill:211 | 他看了我一眼。 | Tā kàn le wǒ yì yǎn. | Anh ấy liếc nhìn tôi một cái. |  |
| s:l2:fill:212 | 她的眼睛很大。 | Tā de yǎnjing hěn dà. | Mắt cô ấy rất to. |  |
| s:l2:fill:213 | 你的嘴怎么了？ | Nǐ de zuǐ zěnme le? | Miệng bạn bị sao thế? |  |
| s:l2:fill:214 | 他的脚比我的大。 | Tā de jiǎo bǐ wǒ de dà. | Chân anh ấy to hơn chân tôi. |  |
| s:l2:fill:215 | 他坐了一天，背很累。 | Tā zuò le yì tiān, bèi hěn lèi. | Anh ấy ngồi cả ngày, mỏi lưng lắm. | 背很累: 腰/背酸 more idiomatic; 酸/疼 not yet available |
| s:l2:fill:216 | 下雨了，他全身都是水。 | Xiàyǔ le, tā quánshēn dōu shì shuǐ. | Trời mưa, anh ấy ướt sũng cả người. | 全身都是水 for "soaked"; 湿 not yet available |
| s:l2:fill:217 | 同学们已经全来了。 | Tóngxuémen yǐjīng quán lái le. | Các bạn trong lớp đã đến đủ cả rồi. |  |
| s:l2:fill:218 | 坐火车能省钱。 | Zuò huǒchē néng shěng qián. | Đi tàu hỏa tiết kiệm được tiền. |  |
| s:l2:fill:219 | 我姐姐在银行工作。 | Wǒ jiějie zài yínháng gōngzuò. | Chị tôi làm việc ở ngân hàng. |  |
| s:l2:fill:220 | 这套房子出租吗？ | Zhè tào fángzi chūzū ma? | Căn nhà này có cho thuê không? |  |
| s:l2:fill:221 | 我的银行卡找不到了。 | Wǒ de yínhángkǎ zhǎo bu dào le. | Tôi không tìm thấy thẻ ngân hàng đâu cả. |  |
| s:l2:fill:222 | 我喜欢猫，不喜欢狗。 | Wǒ xǐhuan māo, bù xǐhuan gǒu. | Tôi thích mèo, không thích chó. |  |
| s:l2:fill:223 | 这条鱼真大！ | Zhè tiáo yú zhēn dà! | Con cá này to thật! |  |
| s:l2:fill:224 | 我奶奶养了很多鸡。 | Wǒ nǎinai yǎng le hěn duō jī. | Bà tôi nuôi rất nhiều gà. |  |
| s:l2:fill:225 | 树上有很多鸟。 | Shù shàng yǒu hěn duō niǎo. | Trên cây có rất nhiều chim. |  |
| s:l2:fill:226 | 小狗在草地上跑。 | Xiǎo gǒu zài cǎodì shàng pǎo. | Chú chó nhỏ chạy trên bãi cỏ. |  |
| s:l2:fill:227 | 这里的草很高。 | Zhèlǐ de cǎo hěn gāo. | Cỏ ở đây rất cao. |  |
| s:l2:fill:228 | 他因为生病，又没来上课。 | Tā yīnwèi shēngbìng, yòu méi lái shàngkè. | Vì bị ốm nên cậu ấy lại không đến lớp. |  |
| s:l2:fill:229 | 你帮我提一下儿这个包。 | Nǐ bāng wǒ tí yíxiàr zhège bāo. | Bạn xách giúp tôi cái túi này một chút. |  |
| s:l2:fill:230 | 我去银行取钱。 | Wǒ qù yínháng qǔ qián. | Tôi đi ngân hàng rút tiền. |  |
| s:l2:fill:231 | 你留在这里，我去买票。 | Nǐ liú zài zhèlǐ, wǒ qù mǎi piào. | Bạn ở lại đây, tôi đi mua vé. |  |
| s:l2:fill:232 | 知道的同学请举手。 | Zhīdào de tóngxué qǐng jǔ shǒu. | Bạn nào biết thì giơ tay lên. |  |
| s:l2:fill:233 | 别碰我的电脑！ | Bié pèng wǒ de diànnǎo! | Đừng động vào máy tính của tôi! |  |
| s:l2:fill:234 | 家庭对他很重要。 | Jiātíng duì tā hěn zhòngyào. | Gia đình rất quan trọng với anh ấy. |  |
| s:l2:fill:235 | 我不喜欢看爱情电影。 | Wǒ bù xǐhuan kàn àiqíng diànyǐng. | Tôi không thích xem phim tình cảm. |  |
| s:l2:fill:236 | 老师给家长打电话了。 | Lǎoshī gěi jiāzhǎng dǎ diànhuà le. | Cô giáo đã gọi điện cho phụ huynh. |  |
| s:l2:fill:237 | 他太太是医生。 | Tā tàitai shì yīshēng. | Vợ anh ấy là bác sĩ. |  |
| s:l2:fill:238 | 我爱人在医院上班。 | Wǒ àiren zài yīyuàn shàngbān. | Chồng tôi đi làm ở bệnh viện. |  |
| s:l2:fill:239 | 他站在我面前。 | Tā zhàn zài wǒ miànqián. | Anh ấy đứng trước mặt tôi. |  |
| s:l2:fill:240 | 他在门边等你。 | Tā zài mén biān děng nǐ. | Anh ấy đang đợi bạn ở cạnh cửa. | 门边 "by the door"; 边 as a free place word |
| s:l2:fill:241 | 你想吃米饭还是面？ | Nǐ xiǎng chī mǐfàn háishi miàn? | Bạn muốn ăn cơm hay ăn mì? |  |
| s:l2:fill:242 | 妈妈不在我身边。 | Māma bú zài wǒ shēnbiān. | Mẹ không ở bên cạnh tôi. |  |
| s:l2:fill:243 | 这个包子五角钱。 | Zhège bāozi wǔ jiǎo qián. | Cái bánh bao này năm hào. | 角 as money unit (course gloss: hào); spoken 毛 |
| s:l2:fill:244 | 路边有一家商店。 | Lùbiān yǒu yì jiā shāngdiàn. | Ven đường có một cửa hàng. |  |
| s:l2:fill:245 | 房间里头有人吗？ | Fángjiān lǐtou yǒu rén ma? | Trong phòng có ai không? |  |
| s:l2:fill:246 | 我们只有一个地球。 | Wǒmen zhǐ yǒu yí ge dìqiú. | Chúng ta chỉ có một Trái Đất. |  |
| s:l2:fill:247 | 河里的水流得很快。 | Hé lǐ de shuǐ liú de hěn kuài. | Nước dưới sông chảy rất xiết. |  |
| s:l2:fill:248 | 我第一次看见大海。 | Wǒ dì yī cì kànjiàn dàhǎi. | Lần đầu tiên tôi được nhìn thấy biển. |  |
| s:l2:fill:249 | 我很喜欢大自然。 | Wǒ hěn xǐhuan dàzìrán. | Tôi rất thích thiên nhiên. |  |
| s:l2:fill:250 | 这个湖像大海一样。 | Zhège hú xiàng dàhǎi yíyàng. | Cái hồ này giống như biển vậy. |  |
| s:l2:fill:251 | 当时我不知道这件事。 | Dāngshí wǒ bù zhīdào zhè jiàn shì. | Lúc đó tôi không biết chuyện này. |  |
| s:l2:fill:252 | 那时我们都是学生。 | Nàshí wǒmen dōu shì xuésheng. | Hồi đó chúng tôi đều là học sinh. |  |
| s:l2:fill:253 | 这时，老师进来了。 | Zhèshí, lǎoshī jìnlai le. | Đúng lúc đó, thầy giáo bước vào. |  |
| s:l2:fill:254 | 现在是三点一刻。 | Xiànzài shì sān diǎn yí kè. | Bây giờ là ba giờ mười lăm. |  |
| s:l2:fill:255 | 你明天有空儿吗？ | Nǐ míngtiān yǒu kòngr ma? | Ngày mai bạn có rảnh không? |  |
| s:l2:fill:256 | 那会儿我还在上大学。 | Nàhuìr wǒ hái zài shàng dàxué. | Hồi đó tôi vẫn còn đang học đại học. |  |
| s:l2:fill:257 | 我家在市中心。 | Wǒ jiā zài shì zhōngxīn. | Nhà tôi ở trung tâm thành phố. |  |
| s:l2:fill:258 | 他在全国都很有名。 | Tā zài quánguó dōu hěn yǒumíng. | Anh ấy nổi tiếng khắp cả nước. |  |
| s:l2:fill:259 | 今年我想去东北看看。 | Jīnnián wǒ xiǎng qù Dōngběi kànkan. | Năm nay tôi muốn đi vùng Đông Bắc xem sao. | 东北 capitalised as region name |
| s:l2:fill:260 | 他去过很多西方国家。 | Tā qù guo hěn duō xīfāng guójiā. | Anh ấy đã đi nhiều nước phương Tây. |  |
| s:l2:fill:261 | 中国是一个东方国家。 | Zhōngguó shì yí ge dōngfāng guójiā. | Trung Quốc là một quốc gia phương Đông. |  |
| s:l2:fill:262 | 西南和西北我都去过。 | Xīnán hé Xīběi wǒ dōu qù guo. | Tây Nam và Tây Bắc tôi đều đã đến. |  |
| s:l2:fill:263 | 我们要向东南走。 | Wǒmen yào xiàng dōngnán zǒu. | Chúng ta phải đi về hướng đông nam. |  |
| s:l2:fill:264 | 我爬不动了。 | Wǒ pá bu dòng le. | Tôi leo không nổi nữa rồi. |  |
| s:l2:fill:265 | 我最喜欢体育课。 | Wǒ zuì xǐhuan tǐyù kè. | Tôi thích nhất giờ thể dục. |  |
| s:l2:fill:266 | 我们去球场打球吧。 | Wǒmen qù qiúchǎng dǎqiú ba. | Chúng mình ra sân chơi bóng đi. |  |
| s:l2:fill:267 | 学校的体育馆很大。 | Xuéxiào de tǐyùguǎn hěn dà. | Nhà thi đấu của trường rất rộng. |  |
| s:l2:fill:268 | 体育场里有很多人。 | Tǐyùchǎng lǐ yǒu hěn duō rén. | Trong sân vận động có rất nhiều người. |  |
| s:l2:fill:269 | 下雨了，我们不去爬山了。 | Xiàyǔ le, wǒmen bú qù páshān le. | Trời mưa rồi, chúng tôi không đi leo núi nữa. |  |
| s:l2:fill:270 | 你的回答是正确的。 | Nǐ de huídá shì zhèngquè de. | Câu trả lời của bạn là đúng. |  |
| s:l2:fill:271 | 我想考汉语三级。 | Wǒ xiǎng kǎo Hànyǔ sān jí. | Tôi muốn thi tiếng Trung cấp ba. |  |
| s:l2:fill:272 | 这条路很平。 | Zhè tiáo lù hěn píng. | Con đường này rất bằng phẳng. |  |
| s:l2:fill:273 | 这次考试你报名了吗？ | Zhè cì kǎoshì nǐ bàomíng le ma? | Kỳ thi lần này bạn đăng ký chưa? |  |
| s:l2:fill:274 | 你说得很准确。 | Nǐ shuō de hěn zhǔnquè. | Bạn nói rất chính xác. |  |
| s:l2:fill:275 | 这个数不对。 | Zhège shù búduì. | Con số này không đúng. |  |
| s:l2:fill:276 | 我在中级班学习。 | Wǒ zài zhōngjí bān xuéxí. | Tôi học ở lớp trung cấp. |  |
| s:l2:fill:277 | 考生都到了吗？ | Kǎoshēng dōu dào le ma? | Thí sinh đã đến đủ chưa? |  |
| s:l2:fill:278 | 他生在北京。 | Tā shēng zài Běijīng. | Anh ấy sinh ra ở Bắc Kinh. | 生在 = 出生在; 出生 not in course |
| s:l2:fill:279 | 这个菜的味道很好。 | Zhège cài de wèidao hěn hǎo. | Món này có vị rất ngon. |  |
| s:l2:fill:280 | 肉还没熟。 | Ròu hái méi shú. | Thịt vẫn chưa chín. |  |
| s:l2:fill:281 | 请给我看一下儿菜单。 | Qǐng gěi wǒ kàn yíxiàr càidān. | Cho tôi xem thực đơn một chút. |  |
| s:l2:fill:282 | 我不会用筷子。 | Wǒ bú huì yòng kuàizi. | Tôi không biết dùng đũa. |  |
| s:l2:fill:283 | 为你的生日干杯！ | Wèi nǐ de shēngrì gānbēi! | Cạn ly mừng sinh nhật bạn! |  |
| s:l2:fill:284 | 你喜欢听什么音乐？ | Nǐ xǐhuan tīng shénme yīnyuè? | Bạn thích nghe nhạc gì? |  |
| s:l2:fill:285 | 他是一个电影明星。 | Tā shì yí ge diànyǐng míngxīng. | Anh ấy là một ngôi sao điện ảnh. |  |
| s:l2:fill:286 | 这件衣服今年很流行。 | Zhè jiàn yīfu jīnnián hěn liúxíng. | Kiểu áo này năm nay rất thịnh hành. |  |
| s:l2:fill:287 | 今天晚上看什么影片？ | Jīntiān wǎnshang kàn shénme yǐngpiàn? | Tối nay mình xem phim gì? |  |
| s:l2:fill:288 | 你看，这是我画的画儿。 | Nǐ kàn, zhè shì wǒ huà de huàr. | Bạn xem này, đây là bức tranh tôi vẽ. |  |
| s:l2:fill:289 | 他给我们说了一个笑话儿。 | Tā gěi wǒmen shuō le yí ge xiàohuar. | Anh ấy kể cho chúng tôi nghe một câu chuyện cười. |  |
| s:l2:fill:290 | 医生给我检查了身体。 | Yīshēng gěi wǒ jiǎnchá le shēntǐ. | Bác sĩ đã khám sức khỏe cho tôi. |  |
| s:l2:fill:291 | 我今天头很疼。 | Wǒ jīntiān tóu hěn téng. | Hôm nay tôi đau đầu quá. |  |
| s:l2:fill:292 | 孩子们在院里玩儿。 | Háizimen zài yuàn lǐ wánr. | Bọn trẻ đang chơi ngoài sân. | 院里 = 院子里 (northern colloquial) |
| s:l2:fill:293 | 我去药店买药。 | Wǒ qù yàodiàn mǎi yào. | Tôi đi nhà thuốc mua thuốc. |  |
| s:l2:fill:294 | 这个药水很难喝。 | Zhège yàoshuǐ hěn nán hē. | Thuốc nước này rất khó uống. |  |
| s:l2:fill:295 | 这些药片一天吃三次。 | Zhèxiē yàopiàn yì tiān chī sān cì. | Những viên thuốc này một ngày uống ba lần. |  |
| s:l2:fill:296 | 你想看中医还是西医？ | Nǐ xiǎng kàn zhōngyī háishi xīyī? | Bạn muốn khám Đông y hay Tây y? |  |
| s:l2:fill:297 | 考试正在进行。 | Kǎoshì zhèngzài jìnxíng. | Kỳ thi đang diễn ra. |  |
| s:l2:fill:298 | 老师的要求很高。 | Lǎoshī de yāoqiú hěn gāo. | Yêu cầu của thầy giáo rất cao. |  |
| s:l2:fill:299 | 我求你一件事。 | Wǒ qiú nǐ yí jiàn shì. | Tôi nhờ bạn một việc. |  |
| s:l2:fill:300 | 这件事我来办。 | Zhè jiàn shì wǒ lái bàn. | Việc này để tôi lo. |  |
| s:l2:fill:301 | 你说的，我一定做到。 | Nǐ shuō de, wǒ yídìng zuòdào. | Những gì bạn nói, tôi nhất định sẽ làm được. |  |
| s:l2:fill:302 | 我一定要实现这个计划。 | Wǒ yídìng yào shíxiàn zhège jìhuà. | Tôi nhất định phải thực hiện kế hoạch này. |  |
| s:l2:fill:303 | 他洗了手，然后坐下吃饭。 | Tā xǐ le shǒu, ránhòu zuòxia chīfàn. | Anh ấy rửa tay rồi ngồi xuống ăn cơm. |  |
| s:l2:fill:304 | 电话通了，但没有人接。 | Diànhuà tōng le, dàn méiyǒu rén jiē. | Điện thoại đã đổ chuông nhưng không ai nghe máy. | 通了 = the call connected |
| s:l2:fill:305 | 喂，请问你是谁？ | Wèi, qǐngwèn nǐ shì shéi? | Alô, xin hỏi ai đấy ạ? |  |
| s:l2:fill:306 | 我给他写了一封信。 | Wǒ gěi tā xiě le yì fēng xìn. | Tôi đã viết cho anh ấy một bức thư. |  |
| s:l2:fill:307 | 你的手机响了。 | Nǐ de shǒujī xiǎng le. | Điện thoại của bạn đổ chuông kìa. |  |
| s:l2:fill:308 | 这篇课文很短。 | Zhè piān kèwén hěn duǎn. | Bài khóa này rất ngắn. |  |
| s:l2:fill:309 | 你可以发短信或打电话。 | Nǐ kěyǐ fā duǎnxìn huò dǎ diànhuà. | Bạn có thể nhắn tin hoặc gọi điện. |  |
| s:l2:fill:310 | 孩子们玩儿得很开心。 | Háizimen wánr de hěn kāixīn. | Bọn trẻ chơi rất vui. |  |
| s:l2:fill:311 | 今天我心情不好。 | Jīntiān wǒ xīnqíng bù hǎo. | Hôm nay tâm trạng tôi không tốt. |  |
| s:l2:fill:312 | 车上坐满了人。 | Chēshàng zuò mǎn le rén. | Trên xe đã chật kín người. |  |
| s:l2:fill:313 | 听了他的话，我很感动。 | Tīng le tā de huà, wǒ hěn gǎndòng. | Nghe anh ấy nói, tôi rất cảm động. |  |
| s:l2:fill:314 | 你的汉语说得挺好。 | Nǐ de Hànyǔ shuō de tǐnghǎo. | Tiếng Trung của bạn nói khá tốt đấy. |  |
| s:l2:fill:315 | 他的车是黄的。 | Tā de chē shì huáng de. | Xe của anh ấy màu vàng. |  |
| s:l2:fill:316 | 中国人喜欢红色。 | Zhōngguó rén xǐhuan hóngsè. | Người Trung Quốc thích màu đỏ. |  |
| s:l2:fill:317 | 山上的树都绿了。 | Shān shàng de shù dōu lǜ le. | Cây trên núi đều xanh cả rồi. |  |
| s:l2:fill:318 | 我的书包是绿色的。 | Wǒ de shūbāo shì lǜsè de. | Cặp sách của tôi màu xanh lá. |  |
| s:l2:fill:319 | 她穿了一件黄色的衣服。 | Tā chuān le yí jiàn huángsè de yīfu. | Cô ấy mặc một chiếc áo màu vàng. |  |
| s:l2:fill:320 | 我去问了，结果他不在。 | Wǒ qù wèn le, jiéguǒ tā bú zài. | Tôi đến hỏi, kết quả là anh ấy không có ở đó. |  |
| s:l2:fill:321 | 电视上的广告太多了。 | Diànshì shàng de guǎnggào tài duō le. | Quảng cáo trên tivi nhiều quá. |  |
| s:l2:fill:322 | 老师通知我们明天考试。 | Lǎoshī tōngzhī wǒmen míngtiān kǎoshì. | Thầy giáo thông báo ngày mai chúng tôi thi. |  |
| s:l2:fill:323 | 你闻一下儿，这是什么味道？ | Nǐ wén yíxiàr, zhè shì shénme wèidao? | Bạn ngửi thử xem, đây là mùi gì? |  |
| s:l2:fill:324 | 我没有纸了，你有吗？ | Wǒ méiyǒu zhǐ le, nǐ yǒu ma? | Tôi hết giấy rồi, bạn có không? |  |
| s:l2:fill:325 | 你看今天的日报了吗？ | Nǐ kàn jīntiān de rìbào le ma? | Bạn đọc báo ngày hôm nay chưa? |  |
| s:l2:fill:326 | 我爸爸喜欢看晚报。 | Wǒ bàba xǐhuan kàn wǎnbào. | Bố tôi thích đọc báo chiều. |  |
| s:l2:fill:327 | 其他的人都走了。 | Qítā de rén dōu zǒu le. | Những người khác đều đi rồi. |  |
| s:l2:fill:328 | 这些书，其中一本是我的。 | Zhèxiē shū, qízhōng yì běn shì wǒ de. | Trong số mấy cuốn sách này, có một cuốn là của tôi. |  |
| s:l2:fill:329 | 这部分很难。 | Zhè bùfen hěn nán. | Phần này rất khó. |  |
| s:l2:fill:330 | 许多人喜欢喝茶。 | Xǔduō rén xǐhuan hē chá. | Rất nhiều người thích uống trà. |  |
| s:l2:fill:331 | 他们买了大量水果。 | Tāmen mǎi le dàliàng shuǐguǒ. | Họ đã mua một lượng lớn trái cây. |  |
| s:l2:fill:332 | 路上有好多车。 | Lùshang yǒu hǎoduō chē. | Trên đường có rất nhiều xe. |  |
| s:l2:fill:333 | 大多数人都有手机。 | Dàduōshù rén dōu yǒu shǒujī. | Đại đa số mọi người đều có điện thoại. |  |
| s:l2:fill:334 | 我只看了一部分。 | Wǒ zhǐ kàn le yíbùfen. | Tôi chỉ xem một phần. |  |
| s:l2:fill:335 | 这里会说汉语的人是少数。 | Zhèlǐ huì shuō Hànyǔ de rén shì shǎoshù. | Ở đây người biết nói tiếng Trung là số ít. |  |
| s:l2:fill:336 | 我们从这个门进入商场。 | Wǒmen cóng zhège mén jìnrù shāngchǎng. | Chúng tôi vào trung tâm thương mại từ cửa này. | 进入 slightly formal; check register |
| s:l2:fill:337 | 他离开家已经三年了。 | Tā líkāi jiā yǐjīng sān nián le. | Anh ấy rời nhà đã ba năm rồi. |  |
| s:l2:fill:338 | 我下班后直接回家。 | Wǒ xiàbān hòu zhíjiē huíjiā. | Tan làm xong tôi về thẳng nhà. |  |
| s:l2:fill:339 | 他从我身边走过。 | Tā cóng wǒ shēnbiān zǒuguò. | Anh ấy đi ngang qua bên cạnh tôi. |  |
| s:l2:fill:340 | 站住！别跑！ | Zhànzhù! Bié pǎo! | Đứng lại! Đừng chạy! |  |
| s:l2:fill:341 | 这正是我想要的。 | Zhè zhèngshì wǒ xiǎng yào de. | Đây chính là cái tôi muốn. |  |
| s:l2:fill:342 | 上课的时候不要讲话。 | Shàngkè de shíhou búyào jiǎnghuà. | Trong giờ học đừng nói chuyện. |  |
| s:l2:fill:343 | 我们来读这段对话。 | Wǒmen lái dú zhè duàn duìhuà. | Chúng ta cùng đọc đoạn hội thoại này. |  |
| s:l2:fill:344 | 这样做不行。 | Zhèyàng zuò bùxíng. | Làm như vậy không được. |  |
| s:l2:fill:345 | 这个包很轻。 | Zhège bāo hěn qīng. | Cái túi này rất nhẹ. |  |
| s:l2:fill:346 | 她一生都住在这里。 | Tā yìshēng dōu zhù zài zhèlǐ. | Cả đời bà ấy đều sống ở đây. |  |
| s:l2:fill:347 | 我儿子出生在二月。 | Wǒ érzi chūshēng zài èr yuè. | Con trai tôi sinh vào tháng hai. |  |
| s:l2:fill:348 | 这是大人的事，孩子别问。 | Zhè shì dàren de shì, háizi bié wèn. | Đây là chuyện của người lớn, trẻ con đừng hỏi. |  |
| s:l2:fill:349 | 这些青年工作很认真。 | Zhèxiē qīngnián gōngzuò hěn rènzhēn. | Những thanh niên này làm việc rất chăm chỉ. |  |
| s:l2:fill:350 | 他少年的时候很爱运动。 | Tā shàonián de shíhou hěn ài yùndòng. | Thời niên thiếu anh ấy rất thích vận động. | 少年时 more literary; 的时候 kept for learners |
| s:l2:fill:351 | 这本书是给青少年看的。 | Zhè běn shū shì gěi qīngshàonián kàn de. | Cuốn sách này dành cho thanh thiếu niên đọc. |  |
| s:l2:fill:352 | 老年人要多休息。 | Lǎonián rén yào duō xiūxi. | Người già nên nghỉ ngơi nhiều. |  |
| s:l2:fill:353 | 人们都喜欢过新年。 | Rénmen dōu xǐhuan guò xīnnián. | Mọi người đều thích đón năm mới. |  |
| s:l2:fill:354 | 现在我放假了，时间很自由。 | Xiànzài wǒ fàngjià le, shíjiān hěn zìyóu. | Giờ tôi được nghỉ, thời gian rất tự do. |  |
| s:l2:fill:355 | 他在一个国际学校上学。 | Tā zài yí ge guójì xuéxiào shàngxué. | Cậu ấy học ở một trường quốc tế. |  |
| s:l2:fill:356 | 这是一件好事。 | Zhè shì yí jiàn hǎoshì. | Đây là một chuyện tốt. |  |
| s:l2:fill:357 | 今天来的人数不多。 | Jīntiān lái de rénshù bù duō. | Số người đến hôm nay không nhiều. |  |
| s:l2:fill:358 | 男人和女人应该平等。 | Nánrén hé nǚrén yīnggāi píngděng. | Đàn ông và phụ nữ nên bình đẳng. |  |
| s:l2:fill:359 | 这座楼有十层。 | Zhè zuò lóu yǒu shí céng. | Tòa nhà này có mười tầng. |  |
| s:l2:fill:360 | 学校的大门在北边。 | Xuéxiào de dàmén zài běibiān. | Cổng chính của trường ở phía bắc. |  |
| s:l2:fill:361 | 他坐在椅子上看书。 | Tā zuò zài yǐzi shàng kàn shū. | Anh ấy ngồi trên ghế đọc sách. |  |
| s:l2:fill:362 | 车上没有座位了。 | Chēshàng méiyǒu zuòwèi le. | Trên xe hết chỗ ngồi rồi. |  |
| s:l2:fill:363 | 这里的住房很贵。 | Zhèlǐ de zhùfáng hěn guì. | Nhà ở ở đây rất đắt. |  |
| s:l2:fill:364 | 请你算一下儿多少钱。 | Qǐng nǐ suàn yíxiàr duōshao qián. | Bạn tính giúp xem bao nhiêu tiền. |  |
| s:l2:fill:365 | 山上的空气很好。 | Shān shàng de kōngqì hěn hǎo. | Không khí trên núi rất trong lành. |  |
| s:l2:fill:366 | 你别气我了。 | Nǐ bié qì wǒ le. | Bạn đừng chọc tức tôi nữa. | 气 in its "làm tức giận" sense (in course gloss) |
| s:l2:fill:367 | 春天来了，花都开了。 | Chūntiān lái le, huā dōu kāi le. | Mùa xuân đến rồi, hoa nở cả rồi. |  |
| s:l2:fill:368 | 我最喜欢北京的秋天。 | Wǒ zuì xǐhuan Běijīng de qiūtiān. | Tôi thích nhất mùa thu ở Bắc Kinh. |  |
| s:l2:fill:369 | 我平时七点起床。 | Wǒ píngshí qī diǎn qǐchuáng. | Bình thường tôi dậy lúc bảy giờ. |  |
| s:l2:fill:370 | 今后我要认真学习。 | Jīnhòu wǒ yào rènzhēn xuéxí. | Từ nay về sau tôi sẽ học hành chăm chỉ. |  |
| s:l2:fill:371 | 我等到十点，他还是没来。 | Wǒ děngdào shí diǎn, tā háishi méi lái. | Tôi đợi đến mười giờ, anh ấy vẫn chưa đến. |  |
| s:l2:fill:372 | 不一会儿，他就回来了。 | Bù yíhuìr, tā jiù huílai le. | Chẳng mấy chốc anh ấy đã quay lại. |  |
| s:l2:fill:373 | 家庭教育很重要。 | Jiātíng jiàoyù hěn zhòngyào. | Giáo dục gia đình rất quan trọng. |  |
| s:l2:fill:374 | 你最喜欢哪一科？ | Nǐ zuì xǐhuan nǎ yì kē? | Bạn thích môn nào nhất? |  |
| s:l2:fill:375 | 我弟弟很喜欢科学。 | Wǒ dìdi hěn xǐhuan kēxué. | Em trai tôi rất thích khoa học. |  |
| s:l2:fill:376 | 校长明天要来我们班。 | Xiàozhǎng míngtiān yào lái wǒmen bān. | Ngày mai thầy hiệu trưởng sẽ đến lớp chúng tôi. |  |
| s:l2:fill:377 | 这个学校的教学水平很高。 | Zhège xuéxiào de jiàoxué shuǐpíng hěn gāo. | Chất lượng giảng dạy của trường này rất cao. |  |
| s:l2:fill:378 | 下个学期我要去中国。 | Xià ge xuéqī wǒ yào qù Zhōngguó. | Học kỳ sau tôi sẽ sang Trung Quốc. |  |
| s:l2:fill:379 | 他当了三年班长。 | Tā dāng le sān nián bānzhǎng. | Cậu ấy đã làm lớp trưởng ba năm. |  |
| s:l2:fill:380 | 中小学的学生下午四点放学。 | Zhōngxiǎoxué de xuésheng xiàwǔ sì diǎn fàngxué. | Học sinh tiểu học và trung học tan học lúc bốn giờ chiều. |  |
| s:l2:fill:381 | 风太大，树倒了。 | Fēng tài dà, shù dǎo le. | Gió to quá, cây đổ rồi. |  |
| s:l2:fill:382 | 你是怎样学汉语的？ | Nǐ shì zěnyàng xué Hànyǔ de? | Bạn đã học tiếng Trung như thế nào? |  |
| s:l2:fill:383 | 他提出了一个新计划。 | Tā tíchū le yí ge xīn jìhuà. | Anh ấy đã đưa ra một kế hoạch mới. |  |
| s:l2:fill:384 | 你喜欢什么样的衣服？ | Nǐ xǐhuan shénmeyàng de yīfu? | Bạn thích quần áo kiểu gì? |  |
| s:l2:fill:385 | 妈妈在楼下喊我。 | Māma zài lóuxià hǎn wǒ. | Mẹ đang gọi tôi ở dưới nhà. |  |
| s:l2:fill:386 | 今天我感觉好多了。 | Jīntiān wǒ gǎnjué hǎo duō le. | Hôm nay tôi thấy đỡ nhiều rồi. |  |
| s:l2:fill:387 | 下班以后，我感到很累。 | Xiàbān yǐhòu, wǒ gǎndào hěn lèi. | Tan làm xong, tôi thấy rất mệt. |  |
| s:l2:fill:388 | 别急，我马上来。 | Bié jí, wǒ mǎshàng lái. | Đừng vội, tôi đến ngay. |  |
| s:l2:fill:389 | 这个电影很可怕。 | Zhège diànyǐng hěn kěpà. | Bộ phim này rất đáng sợ. |  |
| s:l2:fill:390 | 我没想到他会来。 | Wǒ méi xiǎngdào tā huì lái. | Tôi không ngờ anh ấy lại đến. |  |
| s:l2:fill:391 | 在我心中，你最重要。 | Zài wǒ xīnzhōng, nǐ zuì zhòngyào. | Trong lòng tôi, em là quan trọng nhất. |  |
| s:l2:fill:392 | 孩子长大了，懂得了很多事。 | Háizi zhǎngdà le, dǒngde le hěn duō shì. | Con đã lớn, hiểu được nhiều chuyện. | 懂得很多道理 more idiomatic; 道理 not in course |
| s:l2:fill:393 | 去学校要经过一个商场。 | Qù xuéxiào yào jīngguò yí ge shāngchǎng. | Đi đến trường phải đi qua một trung tâm thương mại. |  |
| s:l2:fill:394 | 我的表坏了。 | Wǒ de biǎo huài le. | Đồng hồ của tôi hỏng rồi. |  |
| s:l2:fill:395 | 这件衣服你穿很合适。 | Zhè jiàn yīfu nǐ chuān hěn héshì. | Chiếc áo này bạn mặc rất vừa. |  |
| s:l2:fill:396 | 这家店的顾客都是学生。 | Zhè jiā diàn de gùkè dōu shì xuésheng. | Khách của cửa hàng này đều là học sinh. |  |
| s:l2:fill:397 | 外边很冷，你穿大衣吧。 | Wàibian hěn lěng, nǐ chuān dàyī ba. | Bên ngoài lạnh lắm, bạn mặc áo khoác đi. |  |
| s:l2:fill:398 | 超市里的东西很便宜。 | Chāoshì lǐ de dōngxi hěn piányi. | Đồ trong siêu thị rất rẻ. |  |
| s:l2:fill:399 | 司机开车开得很快。 | Sījī kāichē kāi de hěn kuài. | Bác tài lái xe rất nhanh. |  |
| s:l2:fill:400 | 我妈妈是一名中学教师。 | Wǒ māma shì yì míng zhōngxué jiàoshī. | Mẹ tôi là giáo viên trung học. |  |
| s:l2:fill:401 | 市长今天来我们学校了。 | Shìzhǎng jīntiān lái wǒmen xuéxiào le. | Hôm nay thị trưởng đã đến trường chúng tôi. |  |
| s:l2:fill:402 | 我儿子想当科学家。 | Wǒ érzi xiǎng dāng kēxuéjiā. | Con trai tôi muốn làm nhà khoa học. |  |
| s:l2:fill:403 | 这个商人很会卖东西。 | Zhège shāngrén hěn huì mài dōngxi. | Người thương nhân này rất giỏi bán hàng. |  |
| s:l2:fill:404 | 医院的院长很忙。 | Yīyuàn de yuànzhǎng hěn máng. | Giám đốc bệnh viện rất bận. |  |
| s:l2:fill:405 | 他是很有名的画家。 | Tā shì hěn yǒumíng de huàjiā. | Ông ấy là họa sĩ rất nổi tiếng. |  |
| s:l2:fill:406 | 我们组有五个人。 | Wǒmen zǔ yǒu wǔ ge rén. | Tổ chúng tôi có năm người. |  |
| s:l2:fill:407 | 咱们一起走吧。 | Zánmen yìqǐ zǒu ba. | Chúng mình cùng đi nhé. |  |
| s:l2:fill:408 | 咱去吃饭吧。 | Zán qù chīfàn ba. | Mình đi ăn cơm thôi. | 咱 alone = "we" (northern colloquial) |
| s:l2:fill:409 | 家里来客人了。 | Jiālǐ lái kèrén le. | Nhà có khách đến. |  |
| s:l2:fill:410 | 这个房子的主人是谁？ | Zhège fángzi de zhǔrén shì shéi? | Chủ của ngôi nhà này là ai? |  |
| s:l2:fill:411 | 他很喜欢交朋友。 | Tā hěn xǐhuan jiāo péngyou. | Anh ấy rất thích kết bạn. |  |
| s:l2:fill:412 | 这个鸡蛋有五十克。 | Zhège jīdàn yǒu wǔshí kè. | Quả trứng này nặng năm mươi gram. |  |
| s:l2:fill:413 | 这个手机要一万块钱。 | Zhège shǒujī yào yí wàn kuài qián. | Chiếc điện thoại này giá mười nghìn tệ. |  |
| s:l2:fill:414 | 我家离学校有三公里。 | Wǒ jiā lí xuéxiào yǒu sān gōnglǐ. | Nhà tôi cách trường ba cây số. |  |
| s:l2:fill:415 | 中国有十四亿人。 | Zhōngguó yǒu shísì yì rén. | Trung Quốc có một tỷ bốn trăm triệu người. |  |
| s:l2:fill:416 | 这个包有十公斤重。 | Zhège bāo yǒu shí gōngjīn zhòng. | Cái túi này nặng mười ký. |  |
| s:l2:fill:417 | 一千克等于两斤。 | Yì qiānkè děngyú liǎng jīn. | Một ký bằng hai cân Trung Quốc. |  |
| s:l2:fill:418 | 这条街晚上很安静。 | Zhè tiáo jiē wǎnshang hěn ānjìng. | Con phố này buổi tối rất yên tĩnh. |  |
| s:l2:fill:419 | 车停在门口了。 | Chē tíng zài ménkǒu le. | Xe đỗ ở cửa rồi. |  |
| s:l2:fill:420 | 出口在哪儿？ | Chūkǒu zài nǎr? | Lối ra ở đâu? |  |
| s:l2:fill:421 | 这里的道路很干净。 | Zhèlǐ de dàolù hěn gānjìng. | Đường sá ở đây rất sạch. |  |
| s:l2:fill:422 | 去北京有一条新公路。 | Qù Běijīng yǒu yì tiáo xīn gōnglù. | Đi Bắc Kinh có một tuyến quốc lộ mới. |  |
| s:l2:fill:423 | 停车场已经满了。 | Tíngchēchǎng yǐjīng mǎn le. | Bãi đỗ xe đã đầy rồi. |  |
| s:l2:fill:424 | 我在学校入口等你。 | Wǒ zài xuéxiào rùkǒu děng nǐ. | Tôi đợi bạn ở lối vào trường. |  |
| s:l2:fill:425 | 路上的行人很多。 | Lùshang de xíngrén hěn duō. | Người đi bộ trên đường rất đông. |  |
| s:l2:fill:426 | 我来北京主要是学汉语。 | Wǒ lái Běijīng zhǔyào shì xué Hànyǔ. | Tôi đến Bắc Kinh chủ yếu là để học tiếng Trung. |  |
| s:l2:fill:427 | 我们打算去南方旅行。 | Wǒmen dǎsuàn qù nánfāng lǚxíng. | Chúng tôi định đi du lịch miền Nam. |  |
| s:l2:fill:428 | 请旅客们上车。 | Qǐng lǚkèmen shàngchē. | Mời các hành khách lên xe. |  |
| s:l2:fill:429 | 他是从外地来的。 | Tā shì cóng wàidì lái de. | Anh ấy từ nơi khác đến. |  |
| s:l2:fill:430 | 我们学校的球队很有名。 | Wǒmen xuéxiào de qiúduì hěn yǒumíng. | Đội bóng của trường chúng tôi rất nổi tiếng. |  |
| s:l2:fill:431 | 队长让我们八点出发。 | Duìzhǎng ràng wǒmen bā diǎn chūfā. | Đội trưởng bảo chúng tôi tám giờ xuất phát. |  |
| s:l2:fill:432 | 球没过网。 | Qiú méi guò wǎng. | Bóng không qua lưới. |  |
| s:l2:fill:433 | 他的球鞋是白色的。 | Tā de qiúxié shì báisè de. | Giày thể thao của anh ấy màu trắng. |  |
| s:l2:fill:434 | 妈妈去超市买米。 | Māma qù chāoshì mǎi mǐ. | Mẹ đi siêu thị mua gạo. |  |
| s:l2:fill:435 | 这个蛋坏了，别吃。 | Zhège dàn huài le, bié chī. | Quả trứng này hỏng rồi, đừng ăn. |  |
| s:l2:fill:436 | 冬天要多吃热的食物。 | Dōngtiān yào duō chī rè de shíwù. | Mùa đông nên ăn nhiều đồ ăn nóng. |  |
| s:l2:fill:437 | 我们一起吃晚餐吧。 | Wǒmen yìqǐ chī wǎncān ba. | Chúng ta cùng ăn tối nhé. |  |
| s:l2:fill:438 | 午餐我一般在学校吃。 | Wǔcān wǒ yìbān zài xuéxiào chī. | Bữa trưa tôi thường ăn ở trường. |  |
| s:l2:fill:439 | 快餐吃多了对身体不好。 | Kuàicān chī duō le duì shēntǐ bù hǎo. | Ăn nhiều đồ ăn nhanh không tốt cho sức khỏe. |  |
| s:l2:fill:440 | 你喜欢吃中餐吗？ | Nǐ xǐhuan chī zhōngcān ma? | Bạn có thích ăn món Trung Quốc không? |  |
| s:l2:fill:441 | 今天太累了，我们叫外卖吧。 | Jīntiān tài lèi le, wǒmen jiào wàimài ba. | Hôm nay mệt quá, mình gọi đồ ăn ngoài nhé. |  |
| s:l2:fill:442 | 我不常吃西餐。 | Wǒ bù cháng chī xīcān. | Tôi không hay ăn món Tây. |  |
| s:l2:fill:443 | 我认为他说得对。 | Wǒ rènwéi tā shuō de duì. | Tôi cho rằng anh ấy nói đúng. |  |
| s:l2:fill:444 | 你别那样跟妈妈说话。 | Nǐ bié nàyàng gēn māma shuōhuà. | Con đừng nói chuyện với mẹ kiểu đó. |  |
| s:l2:fill:445 | 从这个角度看，这是好事。 | Cóng zhège jiǎodù kàn, zhè shì hǎoshì. | Nhìn từ góc độ này thì đây là chuyện tốt. |  |
| s:l2:fill:446 | 我喜欢运动，比如说打球、爬山。 | Wǒ xǐhuan yùndòng, bǐrú shuō dǎqiú, páshān. | Tôi thích thể thao, ví dụ như chơi bóng, leo núi. |  |
| s:l2:fill:447 | 你能举一个例子吗？ | Nǐ néng jǔ yí gè lìzi ma? | Bạn có thể nêu một ví dụ không? |  |
| s:l2:fill:448 | 这个菜实在太好吃了。 | Zhège cài shízài tài hǎochī le. | Món này thật sự ngon quá. |  |
| s:l2:fill:449 | 看他的样子，好像很累。 | Kàn tā de yàngzi, hǎoxiàng hěn lèi. | Nhìn dáng vẻ anh ấy, hình như rất mệt. |  |
| s:l2:fill:450 | 这个故事我听了三遍。 | Zhège gùshi wǒ tīng le sān biàn. | Câu chuyện này tôi đã nghe ba lần. |  |
| s:l2:fill:451 | 网上的信息不一定都对。 | Wǎngshàng de xìnxī bù yídìng dōu duì. | Thông tin trên mạng không phải lúc nào cũng đúng. |  |
| s:l2:fill:452 | 这个网站很有用。 | Zhège wǎngzhàn hěn yǒuyòng. | Trang web này rất hữu ích. |  |
| s:l2:fill:453 | 他在大学学计算机。 | Tā zài dàxué xué jìsuànjī. | Anh ấy học ngành máy tính ở đại học. |  |
| s:l2:fill:454 | 我的笔记本在书包里。 | Wǒ de bǐjìběn zài shūbāo lǐ. | Sổ tay của tôi ở trong cặp sách. |  |
| s:l2:fill:455 | 我要打印这些照片。 | Wǒ yào dǎyìn zhèxiē zhàopiàn. | Tôi muốn in những bức ảnh này. |  |
| s:l2:fill:456 | 我的电脑开机很慢。 | Wǒ de diànnǎo kāijī hěn màn. | Máy tính của tôi khởi động rất chậm. |  |
| s:l2:fill:457 | 我们的老师来自北京。 | Wǒmen de lǎoshī láizì Běijīng. | Thầy giáo của chúng tôi đến từ Bắc Kinh. |  |
| s:l2:fill:458 | 请帮我称一下儿这些水果。 | Qǐng bāng wǒ chēng yíxiàr zhèxiē shuǐguǒ. | Làm ơn cân giúp tôi chỗ trái cây này. |  |
| s:l2:fill:459 | 名单上没有我的名字。 | Míngdān shàng méiyǒu wǒ de míngzi. | Trong danh sách không có tên tôi. |  |
| s:l2:fill:460 | 这个节目的名称很有意思。 | Zhège jiémù de míngchēng hěn yǒu yìsi. | Tên của chương trình này rất thú vị. |  |
| s:l2:fill:461 | 今天晚上的月亮多么亮！ | Jīntiān wǎnshang de yuèliang duōme liàng! | Trăng tối nay sáng biết bao! |  |
| s:l2:fill:462 | 瓶子里没有水了。 | Píngzi lǐ méiyǒu shuǐ le. | Trong chai hết nước rồi. |  |
| s:l2:fill:463 | 脏衣服放在洗衣机里。 | Zāng yīfu fàng zài xǐyījī lǐ. | Quần áo bẩn bỏ vào máy giặt. |  |
| s:l2:fill:464 | 爷爷吃完午饭习惯午睡。 | Yéye chī wán wǔfàn xíguàn wǔshuì. | Ông ăn trưa xong có thói quen ngủ trưa. |  |
| s:l2:fill:465 | 有事你随时给我打电话。 | Yǒu shì nǐ suíshí gěi wǒ dǎ diànhuà. | Có việc gì bạn cứ gọi cho tôi bất cứ lúc nào. |  |
| s:l2:fill:466 | 我们一周上五天课。 | Wǒmen yì zhōu shàng wǔ tiān kè. | Chúng tôi học năm ngày một tuần. |  |
| s:l2:fill:467 | 他一夜没睡。 | Tā yí yè méi shuì. | Anh ấy cả đêm không ngủ. |  |
| s:l2:fill:468 | 今天是个好日子。 | Jīntiān shì ge hǎo rìzi. | Hôm nay là một ngày tốt lành. |  |
| s:l2:fill:469 | 上周他生病了，没来上课。 | Shàngzhōu tā shēngbìng le, méi lái shàngkè. | Tuần trước anh ấy bị ốm, không đến lớp. |  |
| s:l2:fill:470 | 早晨的空气很好。 | Zǎochén de kōngqì hěn hǎo. | Không khí buổi sáng sớm rất trong lành. |  |
| s:l2:fill:471 | 这个手表是假的。 | Zhège shǒubiǎo shì jiǎ de. | Chiếc đồng hồ này là đồ giả. |  |
| s:l2:fill:472 | 七月份天气最热。 | Qī yuèfèn tiānqì zuì rè. | Tháng bảy trời nóng nhất. |  |
| s:l2:fill:473 | 夜里下了很大的雨。 | Yèli xià le hěn dà de yǔ. | Trong đêm trời mưa rất to. |  |
| s:l2:fill:474 | 这里全年都很热。 | Zhèlǐ quánnián dōu hěn rè. | Ở đây quanh năm đều nóng. |  |
| s:l2:fill:475 | 春天公园里到处都是花。 | Chūntiān gōngyuán lǐ dàochù dōu shì huā. | Mùa xuân trong công viên đâu đâu cũng là hoa. |  |
| s:l2:fill:476 | 今天一点儿云也没有。 | Jīntiān yìdiǎnr yún yě méiyǒu. | Hôm nay không có một chút mây nào. |  |
| s:l2:fill:477 | 天阴了，好像要下雨。 | Tiān yīn le, hǎoxiàng yào xiàyǔ. | Trời âm u rồi, hình như sắp mưa. |  |
| s:l2:fill:478 | 晚上的风很凉。 | Wǎnshang de fēng hěn liáng. | Gió buổi tối rất mát. |  |
| s:l2:fill:479 | 明天多云，不会下雨。 | Míngtiān duōyún, bú huì xiàyǔ. | Ngày mai nhiều mây, sẽ không mưa. |  |
| s:l2:fill:480 | 雨停了，天晴了。 | Yǔ tíng le, tiān qíng le. | Mưa tạnh rồi, trời quang rồi. |  |
| s:l2:fill:481 | 明天是晴天，我们去爬山吧。 | Míngtiān shì qíngtiān, wǒmen qù páshān ba. | Ngày mai trời nắng, chúng ta đi leo núi nhé. |  |
| s:l2:fill:482 | 阴天的时候我不想出门。 | Yīntiān de shíhou wǒ bù xiǎng chūmén. | Những hôm trời âm u tôi không muốn ra ngoài. |  |
| s:l2:fill:483 | 我们小组有五个人。 | Wǒmen xiǎozǔ yǒu wǔ gè rén. | Nhóm chúng tôi có năm người. |  |
| s:l2:fill:484 | 我们一起去练球吧。 | Wǒmen yìqǐ qù liàn qiú ba. | Chúng ta cùng đi tập bóng nhé. |  |
| s:l2:fill:485 | 请再重复一次。 | Qǐng zài chóngfù yí cì. | Xin hãy nhắc lại một lần nữa. |  |
| s:l2:fill:486 | 想回答的同学请举手。 | Xiǎng huídá de tóngxué qǐng jǔshǒu. | Bạn nào muốn trả lời thì giơ tay. |  |
| s:l2:fill:487 | 课堂上不要玩儿手机。 | Kètáng shàng búyào wánr shǒujī. | Trong lớp học không được chơi điện thoại. |  |
| s:l2:fill:488 | 你的笔记写得很清楚。 | Nǐ de bǐjì xiě de hěn qīngchu. | Bài ghi chép của bạn viết rất rõ ràng. |  |
| s:l2:fill:489 | 今天的作业是写一篇作文。 | Jīntiān de zuòyè shì xiě yì piān zuòwén. | Bài tập hôm nay là viết một bài văn. |  |
| s:l2:fill:490 | 上课的时候要认真听讲。 | Shàngkè de shíhou yào rènzhēn tīngjiǎng. | Trong giờ học phải chăm chú nghe giảng. |  |
| s:l2:fill:491 | 这个词是什么意思？ | Zhège cí shì shénme yìsi? | Từ này nghĩa là gì? |  |
| s:l2:fill:492 | 我们坐船过河吧。 | Wǒmen zuò chuán guò hé ba. | Chúng ta đi thuyền qua sông nhé. |  |
| s:l2:fill:493 | 我骑自行车去学校。 | Wǒ qí zìxíngchē qù xuéxiào. | Tôi đạp xe đạp đến trường. |  |
| s:l2:fill:494 | 路上的车辆越来越多。 | Lùshang de chēliàng yuè lái yuè duō. | Xe cộ trên đường ngày càng nhiều. |  |
| s:l2:fill:495 | 我们骑车去吧，不远。 | Wǒmen qíchē qù ba, bù yuǎn. | Mình đạp xe đi nhé, không xa. |  |
| s:l2:fill:496 | 地铁站就在前边。 | Dìtiězhàn jiù zài qiánbian. | Ga tàu điện ngầm ở ngay phía trước. |  |
| s:l2:fill:497 | 公共汽车上人太多了。 | Gōnggòng qìchē shàng rén tài duō le. | Trên xe buýt đông người quá. |  |
| s:l2:fill:498 | 他走了不久，你就来了。 | Tā zǒu le bùjiǔ, nǐ jiù lái le. | Anh ấy đi chưa lâu thì bạn đến. |  |
| s:l2:fill:499 | 你说的我完全明白。 | Nǐ shuō de wǒ wánquán míngbai. | Những gì bạn nói tôi hoàn toàn hiểu. |  |
| s:l2:fill:500 | 今天的气温超过了三十度。 | Jīntiān de qìwēn chāoguò le sānshí dù. | Nhiệt độ hôm nay đã vượt quá ba mươi độ. |  |
| s:l2:fill:501 | 我们班女生占一半。 | Wǒmen bān nǚshēng zhàn yíbàn. | Lớp chúng tôi nữ sinh chiếm một nửa. |  |
| s:l2:fill:502 | 这件衣服大小正好。 | Zhè jiàn yīfu dàxiǎo zhènghǎo. | Chiếc áo này vừa cỡ. |  |
| s:l2:fill:503 | 我对他有一点儿不满。 | Wǒ duì tā yǒu yìdiǎnr bùmǎn. | Tôi hơi bất mãn với anh ấy. |  |
| s:l2:fill:504 | 他的行为让大家很生气。 | Tā de xíngwéi ràng dàjiā hěn shēngqì. | Hành vi của anh ấy khiến mọi người rất tức giận. |  |
| s:l2:fill:505 | 学习态度很重要。 | Xuéxí tàidu hěn zhòngyào. | Thái độ học tập rất quan trọng. |  |
| s:l2:fill:506 | 这里的人都很友好。 | Zhèlǐ de rén dōu hěn yǒuhǎo. | Người ở đây đều rất thân thiện. |  |
| s:l2:fill:507 | 我相信他是个好人。 | Wǒ xiāngxìn tā shì ge hǎorén. | Tôi tin anh ấy là người tốt. |  |
| s:l2:fill:508 | 电影里的坏人最后怎么样了？ | Diànyǐng lǐ de huàirén zuìhòu zěnmeyàng le? | Kẻ xấu trong phim cuối cùng ra sao? |  |
| s:l2:fill:509 | 这两个你选哪个？ | Zhè liǎng gè nǐ xuǎn nǎge? | Hai cái này bạn chọn cái nào? |  |
| s:l2:fill:510 | 你来这儿的目的是什么？ | Nǐ lái zhèr de mùdì shì shénme? | Mục đích bạn đến đây là gì? |  |
| s:l2:fill:511 | 这样的做法不太好。 | Zhèyàng de zuòfǎ bú tài hǎo. | Cách làm như vậy không hay lắm. |  |
| s:l2:fill:512 | 大家讨论以后，得出了一个结果。 | Dàjiā tǎolùn yǐhòu, déchū le yí gè jiéguǒ. | Mọi người thảo luận xong đã đi đến một kết quả. |  |
| s:l2:fill:513 | 这个难题我们一起想办法。 | Zhège nántí wǒmen yìqǐ xiǎng bànfǎ. | Vấn đề khó này chúng ta cùng nghĩ cách. |  |
| s:l2:fill:514 | 新方法大大提高了成绩。 | Xīn fāngfǎ dàdà tígāo le chéngjì. | Phương pháp mới đã nâng cao thành tích rất nhiều. |  |
| s:l2:fill:515 | 他平常很少说话。 | Tā píngcháng hěn shǎo shuōhuà. | Bình thường anh ấy rất ít nói. |  |
| s:l2:fill:516 | 你在哪个单位工作？ | Nǐ zài nǎge dānwèi gōngzuò? | Bạn làm việc ở đơn vị nào? |  |
| s:l2:fill:517 | 他在一家公司实习。 | Tā zài yì jiā gōngsī shíxí. | Anh ấy đang thực tập ở một công ty. |  |
| s:l2:fill:518 | 你明天回国吧？一路顺风！ | Nǐ míngtiān huíguó ba? Yílù shùnfēng! | Mai bạn về nước phải không? Chúc thuận buồm xuôi gió! |  |
| s:l2:fill:519 | 路上小心，一路平安！ | Lùshang xiǎoxīn, yílù píng'ān! | Đi đường cẩn thận, thượng lộ bình an! |  |
| s:l2:fill:520 | 只要大家平安就好。 | Zhǐyào dàjiā píng'ān jiù hǎo. | Chỉ cần mọi người bình an là tốt rồi. |  |
| s:l2:fill:521 | 这本书送给你。 | Zhè běn shū sònggěi nǐ. | Cuốn sách này tặng bạn. |  |
| s:l2:fill:522 | 今天是公司十周年，晚上有晚会。 | Jīntiān shì gōngsī shí zhōunián, wǎnshang yǒu wǎnhuì. | Hôm nay là kỷ niệm mười năm của công ty, buổi tối có dạ tiệc. |  |
| s:l2:fill:523 | 这很正常，你别急。 | Zhè hěn zhèngcháng, nǐ bié jí. | Chuyện này rất bình thường, bạn đừng sốt ruột. |  |
| s:l2:fill:524 | 这个计划不太实际。 | Zhège jìhuà bú tài shíjì. | Kế hoạch này không thực tế lắm. |  |
| s:l2:fill:525 | 学语言要多说多听。 | Xué yǔyán yào duō shuō duō tīng. | Học ngôn ngữ phải nói nhiều, nghe nhiều. |  |
| s:l2:fill:526 | 这本书是英文的。 | Zhè běn shū shì Yīngwén de. | Cuốn sách này bằng tiếng Anh. |  |
| s:l2:fill:527 | 这些词语都很常用。 | Zhèxiē cíyǔ dōu hěn chángyòng. | Những từ ngữ này đều rất thông dụng. |  |
| s:l2:fill:528 | 不认识的字可以查字典。 | Bú rènshi de zì kěyǐ chá zìdiǎn. | Chữ không biết thì có thể tra từ điển. |  |
| s:l2:fill:529 | 别说这么难听的话。 | Bié shuō zhème nántīng de huà. | Đừng nói những lời khó nghe như vậy. |  |
| s:l2:fill:530 | 我借了老师的词典。 | Wǒ jiè le lǎoshī de cídiǎn. | Tôi đã mượn từ điển của thầy giáo. |  |
| s:l2:fill:531 | 一个汉字就是一个音节。 | Yí gè Hànzì jiù shì yí gè yīnjié. | Một chữ Hán là một âm tiết. |  |
| s:l2:fill:532 | 这个问题又出现了。 | Zhège wèntí yòu chūxiàn le. | Vấn đề này lại xuất hiện rồi. |  |
| s:l2:fill:533 | 这个药没有什么作用。 | Zhège yào méiyǒu shénme zuòyòng. | Thuốc này chẳng có tác dụng gì. |  |
| s:l2:fill:534 | 五个人组成了一个小组。 | Wǔ gè rén zǔchéng le yí gè xiǎozǔ. | Năm người lập thành một nhóm. |  |
| s:l2:fill:535 | 在图书馆要小声说话。 | Zài túshūguǎn yào xiǎoshēng shuōhuà. | Trong thư viện phải nói nhỏ. |  |

## L3

| Id | Chinese | Pinyin | Vietnamese | Note |
|---|---|---|---|---|
