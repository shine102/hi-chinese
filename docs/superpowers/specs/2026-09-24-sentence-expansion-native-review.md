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

## L3

| Id | Chinese | Pinyin | Vietnamese | Note |
|---|---|---|---|---|
