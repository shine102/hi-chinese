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
| s:l2:fill:262 | 西南和西北我都去过。 | Xī'nán hé xīběi wǒ dōu qù guo. | Tây Nam và Tây Bắc tôi đều đã đến. |  |
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

## L3

| Id | Chinese | Pinyin | Vietnamese | Note |
|---|---|---|---|---|
