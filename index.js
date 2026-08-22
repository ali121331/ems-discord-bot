const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  PermissionFlagsBits, 
  ChannelType,
  Partials,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const express = require('express');

// --- UPTIME WEB SUNUCUSU ---
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('EMS Bot 7/24 Aktif!'));
app.listen(PORT, () => console.log(`Uptime web sunucusu ${PORT} portunda hazır.`));

// --- BOT YAPILANDIRMASI ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.Message]
});

const CONFIG = {
  TOKEN: process.env.TOKEN, // Token Render Environment Variables üzerinden güvenli şekilde çekilir
  GUILD_ID: '', 
  VATANDAS_ROLE_ID: '1463553957019521208',
  HASTANE_PERSONELI_ROLE_ID: '1463553957400940731',
  WELCOME_CHANNEL_ID: '1463553957468180700',
  TICKET_CATEGORY_ID: '1540114356329517096',
  KADRO_PANEL_CHANNEL_ID: '1540107816285511742',
  EGITMEN_PANEL_CHANNEL_ID: '1540109400201760899',
  TEDAVI_UCRET_CHANNEL_ID: '1540107777752563793',
  FATURA_LOG_CHANNEL_ID: '1540364891959988324',
  NAME_CHANGE_CHANNEL_ID: '1540108109433933905',
  
  // RANDEVU SİSTEMİ LOG KANALI
  RANDEVU_LOG_CHANNEL_ID: '1540130373004951693',
  
  // YENİ: DOKTOR MÜSAİTLİK KANALI
  DOKTOR_MUSAITLIK_CHANNEL_ID: '1540511510286311504',

  // AKADEMİ MAZERET BİLDİRİM VE İZİN SİSTEMİ
  MAZERET_YAZMA_CHANNEL_ID: '1540109672625733642', 
  MAZERET_LOG_CHANNEL_ID: '1540397820769730641',   
  
  // NORMAL PERSONEL MAZERET BİLDİRİM SİSTEMİ
  NORMAL_MAZERET_YAZMA_CHANNEL_ID: '1540108129063276644',
  NORMAL_MAZERET_LOG_CHANNEL_ID: '1540403175658496073',

  AKADEMI_SORUMLUSU_ROLE_ID: '1540116919833722920',
  TIP_EGITMENI_ROLE_ID: '1540117162838982656',
  IZINLI_PERSONEL_ROLE_ID: '1463553957358993515',

  IMAGE_URL: 'https://cdn.discordapp.com/attachments/1180199538590482514/1540113722423648296/b9fc56e01dcdcce0d228c2271e0b9d0f.png?ex=6a88c62d&is=6a8774ad&hm=bf28ee6d771310a03c1162da6e49190a577dd720c3699289c1df467211dc72b9&',

  ROLES: {
    BASHEKIM: '1463553957468180696',
    BASHEKIM_YARDIMCISI: '1463553957451399268',
    KURUL_UYESI: '1540122702189174806',

    DAHILIYE: '1540103435104559194',
    KARDIYOLOJI: '1540104110039371807',
    GOGUS_HASTALIKLARI: '1540104308056662107',
    NOROLOJI: '1540104445323386880',
    COCUK_SAGLIGI: '1540104582254825542',
    FT_REHABILITASYON: '1540104805026893936',
    CILDIYE: '1540105351683121232',
    PSIKIYATRI: '1540105642348650528',
    GASTROENTEROLOJI: '1540105830903324802',

    CERRAHI: '1540118979077603359',
    GENEL_CERRAHI: '1540106188920725565',
    KADIN_DOGUM: '1540106411558699159',
    GOZ_HASTALIKLARI: '1540106732347465858',
    KBB: '1540106866112331896',
    ORTOPEDI: '1540106991748517958',
    UROLOJI: '1540107167007252520',
    BEYIN_SINIR_CERRAHISI: '1540107274058465290',
    KALP_DAMAR_CERRAHISI: '1540107455361720360',
    GOGUS_CERRAHISI: '1540107637960745070',
    PLASTIK_CERRAHI: '1540107740448423977',
    COCUK_CERRAHISI: '1540107922594467980',

    PROF_DR: '1540120277394915388',
    DOC_DR: '1540120457783681065',
    UZMAN_DOKTOR: '1463553957392547962',
    DOKTOR: '1463553957400940733',
    ASISTAN_DOKTOR: '1540120083018416228',

    HEMSIRE: '1463553957400940732',
    ACIL_YOGUN_BAKIM_ANESTEZI: '1540110402824700014',
    ATT: '1540109655043219538',
    ANESTEZIYOLOJI_REANIMASYON: '1540109826372280390',
    YOGUN_BAKIM_HEMSIRESI: '1540109929677852764',
    TANI_DESTEK_BIRIMLERI: '1540110583863709786',
    RADYOLOJI: '1540110039354970324',
    SORUMLU_PARAMEDIK: '1463553957426237625',
    PARAMEDIK: '1463553957426237624'
  }
};

const activeShifts = new Map();
const totalShifts = new Map();
const userInvoices = new Map(); 
const userInvoiceCounts = new Map(); 
let kadroUpdateTimeout = null;

const SALARY_CONFIG = {
  HOURLY_RATE: 100,      
  INVOICE_PERCENT: 10    
};

const PRICING = {
  ILK_YARDIM: 250,
  AMBULANS: 500,
  KUCUK_CERRAHI: 1500,
  GENEL_AMELIYAT: 5000,
  POLIKLINIK: 300,
  ILAC_SERUM: 200,
  RADYOLOJI: 450
};

// --- ORTAK KADRO PANELİ OLUŞTURMA FONKSİYONU ---
async function updateKadroPanel(guild) {
  const kadroChannel = guild.channels.cache.get(CONFIG.KADRO_PANEL_CHANNEL_ID);
  if (!kadroChannel) return false;

  try {
    await guild.members.fetch();

    const categories = [
      {
        title: '👑 YÖNETİM KADROSU',
        roles: [
          { id: CONFIG.ROLES.BASHEKIM, label: 'Başhekim' },
          { id: CONFIG.ROLES.BASHEKIM_YARDIMCISI, label: 'Başhekim Yardımcısı' },
          { id: CONFIG.ROLES.KURUL_UYESI, label: 'Kurul Üyesi' }
        ]
      },
      {
        title: '🩺 DAHİLİ TIP BİLİMLERİ',
        roles: [
          { id: CONFIG.ROLES.DAHILIYE, label: 'Dahiliye' },
          { id: CONFIG.ROLES.KARDIYOLOJI, label: 'Kardiyoloji' },
          { id: CONFIG.ROLES.GOGUS_HASTALIKLARI, label: 'Göğüs Hastalıkları' },
          { id: CONFIG.ROLES.NOROLOJI, label: 'Nöroloji' },
          { id: CONFIG.ROLES.COCUK_SAGLIGI, label: 'Çocuk Sağlığı ve Hastalıkları' },
          { id: CONFIG.ROLES.FT_REHABILITASYON, label: 'Fiziksel Tıp ve Rehabilitasyon' },
          { id: CONFIG.ROLES.CILDIYE, label: 'Cildiye' },
          { id: CONFIG.ROLES.PSIKIYATRI, label: 'Psikiyatri' },
          { id: CONFIG.ROLES.GASTROENTEROLOJI, label: 'Gastroenteroloji' }
        ]
      },
      {
        title: '🔪 CERRAHİ TIP BİLİMLERİ',
        roles: [
          { id: CONFIG.ROLES.CERRAHI, label: 'Cerrahi' },
          { id: CONFIG.ROLES.GENEL_CERRAHI, label: 'Genel Cerrahi' },
          { id: CONFIG.ROLES.KADIN_DOGUM, label: 'Kadın Hastalıkları ve Doğum' },
          { id: CONFIG.ROLES.GOZ_HASTALIKLARI, label: 'Göz Hastalıkları' },
          { id: CONFIG.ROLES.KBB, label: 'Kulak Burun Boğaz' },
          { id: CONFIG.ROLES.ORTOPEDI, label: 'Ortopedi ve Travmatoloji' },
          { id: CONFIG.ROLES.UROLOJI, label: 'Üroloji' },
          { id: CONFIG.ROLES.BEYIN_SINIR_CERRAHISI, label: 'Beyin ve Sinir Cerrahisi' },
          { id: CONFIG.ROLES.KALP_DAMAR_CERRAHISI, label: 'Kalp ve Damar Cerrahisi' },
          { id: CONFIG.ROLES.GOGUS_CERRAHISI, label: 'Göğüs Cerrahisi' },
          { id: CONFIG.ROLES.PLASTIK_CERRAHI, label: 'Plastik, Rekonstrüktif ve Estetik Cerrahi' },
          { id: CONFIG.ROLES.COCUK_CERRAHISI, label: 'Çocuk Cerrahisi' }
        ]
      },
      {
        title: '👨‍⚕️ HEKİM UNVAN KADROSU',
        roles: [
          { id: CONFIG.ROLES.PROF_DR, label: 'Prof. Dr.' },
          { id: CONFIG.ROLES.DOC_DR, label: 'Doç. Dr.' },
          { id: CONFIG.ROLES.UZMAN_DOKTOR, label: 'Uzman Doktor' },
          { id: CONFIG.ROLES.DOKTOR, label: 'Doktor' },
          { id: CONFIG.ROLES.ASISTAN_DOKTOR, label: 'Asistan Doktor' }
        ]
      },
      {
        title: '🚑 SAĞLIK PERSONELİ & DESTEK BİRİMLERİ',
        roles: [
          { id: CONFIG.ROLES.HEMSIRE, label: 'Hemşire' },
          { id: CONFIG.ROLES.ACIL_YOGUN_BAKIM_ANESTEZI, label: 'Acil, Yoğun Bakım ve Anestezi' },
          { id: CONFIG.ROLES.ATT, label: 'Acil Tıp Teknisyeni' },
          { id: CONFIG.ROLES.ANESTEZIYOLOJI_REANIMASYON, label: 'Anesteziyoloji ve Reanimasyon' },
          { id: CONFIG.ROLES.YOGUN_BAKIM_HEMSIRESI, label: 'Yoğun Bakım Hemşiresi' },
          { id: CONFIG.ROLES.TANI_DESTEK_BIRIMLERI, label: 'Tanı ve Destek Birimleri' },
          { id: CONFIG.ROLES.RADYOLOJI, label: 'Radyoloji' },
          { id: CONFIG.ROLES.SORUMLU_PARAMEDIK, label: 'Sorumlu Paramedik' },
          { id: CONFIG.ROLES.PARAMEDIK, label: 'Paramedik' }
        ]
      }
    ];

    let embedDescription = '';

    categories.forEach(cat => {
      let categoryContent = '';
      cat.roles.forEach(roleObj => {
        const membersWithRole = guild.members.cache.filter(m => m.roles.cache.has(roleObj.id));
        if (membersWithRole.size > 0) {
          const names = membersWithRole.map(m => m.displayName).join(', ');
          categoryContent += `• **${roleObj.label}:** ${names}\n`;
        }
      });

      if (categoryContent.length > 0) {
        embedDescription += `\n**${cat.title}**\n${categoryContent}`;
      }
    });

    if (!embedDescription) {
      embedDescription = 'Henüz kadroda kayıtlı personel bulunmamaktadır.';
    }

    const kadroEmbed = new EmbedBuilder()
      .setTitle('🚑 EMS HASTANE KADROSU')
      .setColor('#ff0000')
      .setDescription(embedDescription)
      .setImage(CONFIG.IMAGE_URL)
      .setTimestamp();

    const fetchedMessages = await kadroChannel.messages.fetch({ limit: 10 });
    const lastBotMessage = fetchedMessages.find(m => m.author.id === client.user.id);

    if (lastBotMessage) {
      await lastBotMessage.edit({ embeds: [kadroEmbed] });
    } else {
      await kadroChannel.send({ embeds: [kadroEmbed] });
    }
    return true;

  } catch (err) {
    console.error('Kadro paneli güncellenirken hata oluştu:', err);
    return false;
  }
}

// --- EĞİTMEN KADROSU PANELİ OLUŞTURMA FONKSİYONU ---
async function updateEgitmenPanel(guild) {
  const egitmenChannel = guild.channels.cache.get(CONFIG.EGITMEN_PANEL_CHANNEL_ID);
  if (!egitmenChannel) return false;

  try {
    await guild.members.fetch();

    const akademiSorumlulari = guild.members.cache.filter(m => 
      m.roles.cache.has(CONFIG.AKADEMI_SORUMLUSU_ROLE_ID)
    );

    const tipEgitmenleri = guild.members.cache.filter(m => 
      m.roles.cache.has(CONFIG.TIP_EGITMENI_ROLE_ID) && !m.roles.cache.has(CONFIG.AKADEMI_SORUMLUSU_ROLE_ID)
    );

    let egitmenDescription = 
      "Tıp Akademisi bünyesinde teorik, klinik ve pratik eğitim süreçlerini yönetecek yetkili eğitmen kadromuz aşağıda belirtilmiştir. " +
      "Akademi ile ilgili tüm ders takipleri, mazeret bildirimleri ve sınav değerlendirmeleri bu kadro sorumluluğundadır.\n\n" +
      "**AKADEMİ YÖNETİMİ VE EĞİTMENLER**\n";

    if (akademiSorumlulari.size > 0) {
      akademiSorumlulari.forEach(m => {
        egitmenDescription += `• **[ 🎓 ] Akademi Sorumlusu:** ${m}\n*(Akademi müfredatının yürütülmesi, sınav takvimi, idari koordinasyon ve teorik/pratik tıp dersleri sorumlusu)*\n`;
      });
    } else {
      egitmenDescription += `• **[ 🎓 ] Akademi Sorumlusu:** Atanmış personel bulunmamaktadır.\n`;
    }

    egitmenDescription += "\n**EĞİTMEN KADROSU**\n";

    if (tipEgitmenleri.size > 0) {
      tipEgitmenleri.forEach(m => {
        egitmenDescription += `• **[ 🧑‍🏫 ] Tıp Eğitmeni:** ${m}\n*(Teorik tıp dersleri, klinikte hasta kabulü, vital bulgular ve pratik simülasyonlar sorumlusu)*\n`;
      });
    } else {
      egitmenDescription += `• **[ 🧑‍🏫 ] Tıp Eğitmeni:** Atanmış personel bulunmamaktadır.\n`;
    }

    const egitmenEmbed = new EmbedBuilder()
      .setTitle('EMERGENCY MEDICAL SERVICES — AKADEMİ EĞİTMEN KADROSU')
      .setColor('#5865F2')
      .setDescription(egitmenDescription)
      .setImage(CONFIG.IMAGE_URL)
      .setTimestamp();

    const fetchedMessages = await egitmenChannel.messages.fetch({ limit: 10 });
    const lastBotMessage = fetchedMessages.find(m => m.author.id === client.user.id);

    if (lastBotMessage) {
      await lastBotMessage.edit({ embeds: [egitmenEmbed] });
    } else {
      await egitmenChannel.send({ embeds: [egitmenEmbed] });
    }
    return true;

  } catch (err) {
    console.error('Eğitmen kadro paneli güncellenirken hata oluştu:', err);
    return false;
  }
}

client.once('ready', () => {
  console.log(`[BOT] ${client.user.tag} aktif!`);
});

// Otomatik Rol ve Hoş Geldin Mesajı
client.on('guildMemberAdd', async (member) => {
  try {
    const role = member.guild.roles.cache.get(CONFIG.VATANDAS_ROLE_ID);
    if (role) await member.roles.add(role);
  } catch (err) {
    console.error('Rol hatası:', err);
  }

  const welcomeChannel = member.guild.channels.cache.get(CONFIG.WELCOME_CHANNEL_ID);
  if (!welcomeChannel) return;

  const welcomeEmbed = new EmbedBuilder()
    .setColor('#0099ff')
    .setImage(CONFIG.IMAGE_URL);

  await welcomeChannel.send({
    content: `Merhaba ${member} **EMERGENCY MEDICAL SERVICES**'e Hoşgeldin!\n**EMS ekibine katıldın. Hazır ol, hayat kurtar ve görevini gururla yerine getir!**`,
    embeds: [welcomeEmbed]
  });
});

// OTOMATİK PANELLERİ GÜNCELLEME (KADRO & EĞİTMEN)
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  const oldRoles = oldMember.roles.cache.map(r => r.id).sort().join(',');
  const newRoles = newMember.roles.cache.map(r => r.id).sort().join(',');

  const hasNameChanged = oldMember.displayName !== newMember.displayName;
  const hasRolesChanged = oldRoles !== newRoles;

  if (!hasNameChanged && !hasRolesChanged) return;

  if (kadroUpdateTimeout) clearTimeout(kadroUpdateTimeout);

  kadroUpdateTimeout = setTimeout(async () => {
    console.log(`[OTOMATİK PANEL] ${newMember.user.tag} verisi değişti, tüm paneller güncelleniyor...`);
    await updateKadroPanel(newMember.guild);
    await updateEgitmenPanel(newMember.guild);
  }, 2000);
});

// KANAL VE MESAJ DİNLEME
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  // --- 1. OTOMATİK İSİM DEĞİŞTİRME KANALI ---
  if (message.channel.id === CONFIG.NAME_CHANGE_CHANNEL_ID) {
    const newName = message.content.trim();

    if (newName.length > 32) {
      const infoMsg = await message.reply('❌ **İsim 32 karakterden uzun olamaz.**');
      setTimeout(() => {
        message.delete().catch(() => {});
        infoMsg.delete().catch(() => {});
      }, 5000);
      return;
    }

    try {
      await message.member.setNickname(newName);
      const successMsg = await message.channel.send(`✅ ${message.author}, sunucudaki isminiz başarıyla **"${newName}"** olarak güncellendi.`);
      
      setTimeout(() => {
        message.delete().catch(() => {});
        successMsg.delete().catch(() => {});
      }, 5000);

    } catch (err) {
      console.error('İsim değiştirme hatası:', err);
      const errorMsg = await message.channel.send(`❌ ${message.author}, isminiz değiştirilemedi! *(Yetki hiyerarşisi nedeniyle Sunucu Sahibi veya üst yetkililerin ismi bot tarafından değiştirilemez.)*`);
      
      setTimeout(() => {
        message.delete().catch(() => {});
        errorMsg.delete().catch(() => {});
      }, 7000);
    }
    return;
  }

  // --- 2. AKADEMİ DERS MAZERET BİLDİRİ KANALI İŞLEMLERİ ---
  if (message.channel.id === CONFIG.MAZERET_YAZMA_CHANNEL_ID) {
    const msgId = message.id;

    const mazeretEmbed = new EmbedBuilder()
      .setTitle('📥 Yeni Akademi Ders Mazeret Bildirimi')
      .setColor('#ff9900')
      .addFields(
        { name: 'Gönderen Personel', value: `${message.author} (${message.author.tag})`, inline: true },
        { name: 'Personel ID', value: `${message.author.id}`, inline: true },
        { name: 'Mazeret Detayı', value: message.content || 'Görsel/Dosya Gönderildi' }
      )
      .setFooter({ text: `Mazeret ID: ${msgId}` })
      .setTimestamp();

    if (message.attachments.size > 0) {
      mazeretEmbed.setImage(message.attachments.first().url);
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`btn_mazeret_onay_${message.author.id}_${msgId}`)
        .setLabel('Onayla & İzin Ver')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`btn_mazeret_red_${message.author.id}_${msgId}`)
        .setLabel('Mazereti Reddet')
        .setStyle(ButtonStyle.Danger)
    );

    const logChannel = message.guild.channels.cache.get(CONFIG.MAZERET_LOG_CHANNEL_ID);
    if (logChannel) {
      await logChannel.send({
        content: `📌 <@&${CONFIG.AKADEMI_SORUMLUSU_ROLE_ID}> **Yeni Mazeret Bildirimi:** ${message.author}`,
        embeds: [mazeretEmbed],
        components: [row]
      });
    }

    try {
      await message.guild.members.fetch();
      const akademiSorumlulari = message.guild.members.cache.filter(m => 
        m.roles.cache.has(CONFIG.AKADEMI_SORUMLUSU_ROLE_ID) && !m.user.bot
      );

      akademiSorumlulari.forEach(async (sorumlu) => {
        try {
          await sorumlu.send({
            content: `🔔 **Akademi Mazeret Bildirimi:** ${message.author} bir mazeret bildiriminde bulundu.`,
            embeds: [mazeretEmbed],
            components: [row]
          });
        } catch (dmErr) {}
      });
    } catch (err) {}

    try { await message.delete(); } catch (err) {}
    return;
  }

  // --- 3. NORMAL PERSONEL MAZERET BİLDİRİ KANALI İŞLEMLERİ ---
  if (message.channel.id === CONFIG.NORMAL_MAZERET_YAZMA_CHANNEL_ID) {
    const msgId = message.id;

    const mazeretEmbed = new EmbedBuilder()
      .setTitle('📋 Yeni Personel Mazeret Bildirimi')
      .setColor('#ffaa00')
      .addFields(
        { name: 'Gönderen Personel', value: `${message.author} (${message.author.tag})`, inline: true },
        { name: 'Personel ID', value: `${message.author.id}`, inline: true },
        { name: 'Mazeret Detayı', value: message.content || 'Görsel/Dosya Gönderildi' }
      )
      .setFooter({ text: `Normal Mazeret ID: ${msgId}` })
      .setTimestamp();

    if (message.attachments.size > 0) {
      mazeretEmbed.setImage(message.attachments.first().url);
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`btn_norm_mazeret_onay_${message.author.id}_${msgId}`)
        .setLabel('Onayla & İzin Ver')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`btn_norm_mazeret_red_${message.author.id}_${msgId}`)
        .setLabel('Mazereti Reddet')
        .setStyle(ButtonStyle.Danger)
    );

    const logChannel = message.guild.channels.cache.get(CONFIG.NORMAL_MAZERET_LOG_CHANNEL_ID);
    if (logChannel) {
      await logChannel.send({
        content: `📌 **Yeni Personel Mazeret Bildirimi:** ${message.author}`,
        embeds: [mazeretEmbed],
        components: [row]
      });
    }

    try { await message.delete(); } catch (err) {}
    return;
  }

  // --- 4. TEDAVİ ÜCRET KANALI İŞLEMLERİ ---
  if (message.channel.id === CONFIG.TEDAVI_UCRET_CHANNEL_ID) {
    const logChannel = message.guild.channels.cache.get(CONFIG.FATURA_LOG_CHANNEL_ID);

    const matches = message.content.match(/\d+/g);
    let invoiceAmount = 0;
    if (matches && matches.length > 0) {
      invoiceAmount = parseFloat(matches[0]); 
    }

    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle('📑 Yeni Tedavi / Fatura Kaydı')
        .setColor('#00ffcc')
        .addFields(
          { name: 'Personel', value: `${message.author} (${message.author.tag})`, inline: true },
          { name: 'Algılanan Fatura Tutarı', value: `$${invoiceAmount}`, inline: true },
          { name: 'İçerik / Detay', value: message.content || 'Görsel/Dosya Gönderildi' }
        )
        .setTimestamp();

      if (message.attachments.size > 0) {
        embed.setImage(message.attachments.first().url);
      }

      await logChannel.send({ embeds: [embed] });

      const currentAmount = userInvoices.get(message.author.id) || 0;
      const currentCount = userInvoiceCounts.get(message.author.id) || 0;

      userInvoices.set(message.author.id, currentAmount + invoiceAmount);
      userInvoiceCounts.set(message.author.id, currentCount + 1);
    }

    try {
      await message.delete();
    } catch (err) {
      console.error('Mesaj silinemedi:', err);
    }
    return;
  }

  // --- YÖNETİCİ VE SİSTEM KOMUTLARI ---
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

  const args = message.content.trim().split(/ +/);
  const command = args[0].toLowerCase();

  // YENİ: DOKTOR MÜSAİTLİK PANELİ KURMA KOMUTU
  if (command === '!kur-musaitlik') {
    const musaitlikEmbed = new EmbedBuilder()
      .setTitle('👨‍⚕️ Doktor Müsaitlik Bildirim Paneli')
      .setDescription('Kıymetli doktorlarımız, hastaların poliklinik randevusu alabilmesi için görev yeriniz ve müsait olduğunuz tarih aralıklarını aşağıdaki butonu kullanarak bildiriniz. Bu veriler Müsaitlik Kanalı üzerinden şeffaf şekilde takip edilecektir.')
      .setColor('#00ffcc')
      .setImage(CONFIG.IMAGE_URL);

    const btn = new ButtonBuilder()
      .setCustomId('btn_musaitlik_bildir')
      .setLabel('Müsaitlik Bildir')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🕒');

    const row = new ActionRowBuilder().addComponents(btn);
    const channel = message.guild.channels.cache.get(CONFIG.DOKTOR_MUSAITLIK_CHANNEL_ID) || message.channel;

    await channel.send({ embeds: [musaitlikEmbed], components: [row] });
    try { await message.delete(); } catch (e) {}
  }

  // RANDEVU PANELİ KURMA KOMUTU
  if (command === '!kur-randevu') {
    const randevuEmbed = new EmbedBuilder()
      .setTitle('🏥 Hastane Randevu Sistemi')
      .setDescription('Poliklinik randevusu oluşturmak için aşağıdaki "Randevu Al" butonuna tıklayarak formu eksiksiz şekilde doldurunuz. Talebiniz en kısa sürede yetkililerimize iletilecektir.')
      .setColor('#0099ff')
      .setImage(CONFIG.IMAGE_URL);

    const btn = new ButtonBuilder()
      .setCustomId('btn_randevu_al')
      .setLabel('Randevu Al')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📅');

    const row = new ActionRowBuilder().addComponents(btn);

    await message.channel.send({ embeds: [randevuEmbed], components: [row] });
    try { await message.delete(); } catch (e) {}
  }

  // DM ÜZERİNDEN RANDEVU PANELİ GÖNDERME KOMUTU
  if (command === '!randevu-gonder') {
    const targetUser = message.mentions.users.first() || client.users.cache.get(args[1]);
    if (!targetUser) return message.reply('❌ **Hatalı kullanım:** Lütfen bir kullanıcı etiketleyin veya ID girin. (Örn: `!randevu-gonder @Vatandaş`)');

    const randevuEmbed = new EmbedBuilder()
      .setTitle('🏥 Hastane Randevu Sistemi')
      .setDescription('Hastanemizden randevu almak için aşağıdaki butona tıklayarak formu doldurunuz.')
      .setColor('#0099ff')
      .setImage(CONFIG.IMAGE_URL);

    const btn = new ButtonBuilder()
      .setCustomId('btn_randevu_al')
      .setLabel('Randevu Al')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📅');

    const row = new ActionRowBuilder().addComponents(btn);

    try {
      await targetUser.send({ embeds: [randevuEmbed], components: [row] });
      await message.reply(`✅ Randevu paneli ${targetUser} adlı kullanıcıya DM üzerinden başarıyla gönderildi.`);
    } catch (error) {
      await message.reply(`❌ ${targetUser} adlı kullanıcının DM kutusu kapalı olduğu için mesaj gönderilemedi.`);
    }
  }

  if (command === '!kur-isim-sablon') {
    const nameChannel = message.guild.channels.cache.get(CONFIG.NAME_CHANGE_CHANNEL_ID) || message.channel;

    const sablonEmbed = new EmbedBuilder()
      .setTitle('📝 SUNUCU İSİM DEĞİŞTİRME BİLDİRİMİ')
      .setColor('#00ffcc')
      .setDescription(
        `Sunucudaki isminizi değiştirmek için kullanmak istediğiniz **Ad Soyad / Karakter İsmini** doğrudan bu kanala yazmanız yeterlidir.\n\n` +
        `📌 **Örnek Kullanım:**\n` +
        `\`\`\`\n` +
        `John Doe\n` +
        `\`\`\`\n` +
        `⚠️ **Bilgilendirme:**\n` +
        `• Yazdığınız metin otomatik olarak sunucu takma adınız (nickname) olarak ayarlanacaktır.\n` +
        `• İsminiz güncellendikten sonra mesajınız ve sistem yanıtı kanal temizliği için **otomatik olarak silinecektir**.\n` +
        `• İsim uzunluğu **32 karakteri** geçemez.`
      )
      .setImage(CONFIG.IMAGE_URL)
      .setTimestamp();

    await nameChannel.send({ embeds: [sablonEmbed] });
    try { await message.delete(); } catch (e) {}
  }

  if (command === '!kur-mazeret-sablon') {
    const mazeretChannel = message.guild.channels.cache.get(CONFIG.MAZERET_YAZMA_CHANNEL_ID) || message.channel;

    const sablonEmbed = new EmbedBuilder()
      .setTitle('📚 AKADEMİ DERS MAZERET BİLDİRİM FORMU')
      .setColor('#ff9900')
      .setDescription(
        `Eğitim ve Akademi derslerine katılım sağlayamayacak kişilerin mazeretlerini aşağıdaki formata uygun olarak bu kanala yazmaları gerekmektedir.\n\n` +
        `📌 **Mazeret Bildirim Formatı:**\n` +
        `\`\`\`\n` +
        `Ad Soyad / Rütbe: \n` +
        `Katılamayacağı Ders / Saat: \n` +
        `Mazeret / Katılamama Sebebi: \n` +
        `\`\`\`\n` +
        `⚠️ *Attığınız mazeret bildirimleri mazeret kanalına ve Akademi Sorumlularının DM kutusuna düşecek, yetkililer tarafından onaylanacak veya reddedilecektir.*`
      )
      .setImage(CONFIG.IMAGE_URL)
      .setTimestamp();

    await mazeretChannel.send({ embeds: [sablonEmbed] });
    try { await message.delete(); } catch (e) {}
  }

  if (command === '!kur-normal-mazeret-sablon') {
    const normalMazeretChannel = message.guild.channels.cache.get(CONFIG.NORMAL_MAZERET_YAZMA_CHANNEL_ID) || message.channel;

    const sablonEmbed = new EmbedBuilder()
      .setTitle('📋 EMS PERSONEL MAZERET BİLDİRİM FORMU')
      .setColor('#ffaa00')
      .setDescription(
        `Mesai, nöbet, toplantı veya aktif görevlere katılım sağlayamayacak tüm personellerin mazeretlerini aşağıdaki formata uygun olarak bu kanala bildirmesi gerekmektedir.\n\n` +
        `📌 **Mazeret Bildirim Formatı:**\n` +
        `\`\`\`\n` +
        `Ad Soyad / Rütbe: \n` +
        `Mazeretli Olunan Tarih / Saat Aralığı: \n` +
        `Mazeret Türü (Nöbet / Mesai / Toplantı / Ailevi): \n` +
        `Mazeret / Açıklama: \n` +
        `\`\`\`\n` +
        `⚠️ *Gelen mazeret bildirimleri üst yönetimin onayına düşecek ve değerlendirme sonucu tarafınıza DM ile iletilecektir.*`
      )
      .setImage(CONFIG.IMAGE_URL)
      .setTimestamp();

    await normalMazeretChannel.send({ embeds: [sablonEmbed] });
    try { await message.delete(); } catch (e) {}
  }

  if (command === '!kadro-guncelle') {
    if (kadroUpdateTimeout) clearTimeout(kadroUpdateTimeout);

    const success = await updateKadroPanel(message.guild);
    try { await message.delete(); } catch (e) {}

    if (success) {
      const msg = await message.channel.send('✅ **Kadro paneli başarıyla güncellendi!**');
      setTimeout(() => msg.delete().catch(() => {}), 5000);
    } else {
      const msg = await message.channel.send('❌ **Kadro paneli güncellenirken bir hata oluştu veya kanal bulunamadı.**');
      setTimeout(() => msg.delete().catch(() => {}), 5000);
    }
  }

  if (command === '!egitmen-kadro-guncelle') {
    const success = await updateEgitmenPanel(message.guild);
    try { await message.delete(); } catch (e) {}

    if (success) {
      const msg = await message.channel.send('✅ **Eğitmen kadro paneli başarıyla güncellendi!**');
      setTimeout(() => msg.delete().catch(() => {}), 5000);
    } else {
      const msg = await message.channel.send('❌ **Eğitmen kadro paneli güncellenirken bir hata oluştu veya kanal bulunamadı.**');
      setTimeout(() => msg.delete().catch(() => {}), 5000);
    }
  }

  if (command === '!kur-mesai') {
    const embed = new EmbedBuilder()
      .setTitle('🚑 EMS Mesai Takip Paneli')
      .setDescription('Mesai işlemlerinizi ve geçmiş toplam mesai sürenizi aşağıdaki butonlardan yönetebilirsiniz.')
      .setColor('#ff0000')
      .setImage(CONFIG.IMAGE_URL);

    const btnGiris = new ButtonBuilder().setCustomId('btn_mesai_giris').setLabel('Mesai Giriş').setStyle(ButtonStyle.Success);
    const btnCikis = new ButtonBuilder().setCustomId('btn_mesai_cikis').setLabel('Mesai Çıkış').setStyle(ButtonStyle.Danger);
    const btnToplam = new ButtonBuilder().setCustomId('btn_toplam_mesai').setLabel('Toplam Mesailerim').setStyle(ButtonStyle.Secondary);
    const btnTümMesailer = new ButtonBuilder().setCustomId('btn_tum_mesailer').setLabel('Tüm Personel Mesaileri').setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(btnGiris, btnCikis, btnToplam, btnTümMesailer);

    await message.channel.send({ embeds: [embed], components: [row] });
    try { await message.delete(); } catch (e) {}
  }

  if (command === '!kur-ticket') {
    const embed = new EmbedBuilder()
      .setTitle('🎫 Destek / Ticket Sistemi')
      .setDescription('Yetkililerle iletişime geçmek için aşağıdaki butona tıklayarak talep oluşturabilirsiniz.')
      .setColor('#00ff00');

    const btnTicket = new ButtonBuilder().setCustomId('btn_ticket_ac').setLabel('Ticket Oluştur').setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder().addComponents(btnTicket);

    await message.channel.send({ embeds: [embed], components: [row] });
    try { await message.delete(); } catch (e) {}
  }

  if (command === '!fiyat-ayarla') {
    if (args.length < 8) {
      return message.reply('❌ **Hatalı kullanım!** Lütfen 7 fiyat değerini de giriniz.\n**Örnek:** `!fiyat-ayarla 250 500 1500 5000 300 200 450`');
    }

    const prices = args.slice(1, 8).map(v => parseFloat(v));
    if (prices.some(p => isNaN(p) || p < 0)) {
      return message.reply('❌ **Hatalı kullanım!** Tüm fiyat değerleri geçerli birer pozitif sayı olmalıdır.');
    }

    PRICING.ILK_YARDIM = prices[0];
    PRICING.AMBULANS = prices[1];
    PRICING.KUCUK_CERRAHI = prices[2];
    PRICING.GENEL_AMELIYAT = prices[3];
    PRICING.POLIKLINIK = prices[4];
    PRICING.ILAC_SERUM = prices[5];
    PRICING.RADYOLOJI = prices[6];

    return message.reply('✅ **Tedavi ve Hizmet Ücret Tarifesi Güncellendi!**');
  }

  if (command === '!kur-fiyat-listesi') {
    const targetChannel = message.guild.channels.cache.get(CONFIG.TEDAVI_UCRET_CHANNEL_ID) || message.channel;

    const listEmbed = new EmbedBuilder()
      .setTitle('🏥 EMS TEDAVİ VE HİZMET ÜCRET TARİFESİ')
      .setColor('#ff0000')
      .setDescription(
        'Aşağıda hastanemizde uygulanan varsayılan tedavi ücretleri listelenmiştir:\n\n' +
        `• **İlk Yardım Müdahalesi:** $${PRICING.ILK_YARDIM}\n` +
        `• **Ambulans Çağrı / Nakil Ücreti:** $${PRICING.AMBULANS}\n` +
        `• **Küçük Cerrahi Operasyonlar / Ameliyat:** $${PRICING.KUCUK_CERRAHI}\n` +
        `• **Genel Ameliyat ve Yoğun Bakım:** $${PRICING.GENEL_AMELIYAT}\n` +
        `• **Poliklinik Muayene Ücreti:** $${PRICING.POLIKLINIK}\n` +
        `• **İlaç ve Serum Tedavisi:** $${PRICING.ILAC_SERUM}\n` +
        `• **Radyolojik Görüntüleme / Tahlil:** $${PRICING.RADYOLOJI}\n\n` +
        '--------------------------------------------------\n' +
        '⚠️ **FATURA BİLDİRİM ŞABLONU**\n' +
        'Kestiğiniz faturaların maaşınıza tam yansıması için bu kanala mesaj atarken **mutlaka** aşağıdaki formatı kullanınız:\n\n' +
        '📌 **Şablon:** `[Hasta Adı Soyadı] - [Yapılan İşlem] - [Tutar]`\n' +
        '💡 **Örnek:** `Marcus Holloway - Ameliyat - 5000$`'
      )
      .setImage(CONFIG.IMAGE_URL)
      .setTimestamp();

    await targetChannel.send({ embeds: [listEmbed] });
    try { await message.delete(); } catch (e) {}
  }

  if (command === '!maas-ayarla') {
    const hourly = parseFloat(args[1]);
    const percent = parseFloat(args[2]);

    if (isNaN(hourly) || isNaN(percent)) {
      return message.reply('❌ **Hatalı kullanım!** Örnek: `!maas-ayarla 100 15`');
    }

    SALARY_CONFIG.HOURLY_RATE = hourly;
    SALARY_CONFIG.INVOICE_PERCENT = percent;

    return message.reply(`✅ **Maaş parametreleri güncellendi!**\n• Saat Başı Ücret: **$${hourly}**\n• Fatura Prim Yüzdesi: **%${percent}**`);
  }

  if (command === '!maas-hesapla') {
    const targetUser = message.mentions.users.first() || message.author;

    let accumulatedMs = totalShifts.get(targetUser.id) || 0;
    if (activeShifts.has(targetUser.id)) {
      const shift = activeShifts.get(targetUser.id);
      accumulatedMs += (Date.now() - shift.startTime);
    }

    const totalHours = accumulatedMs / (1000 * 60 * 60);
    const totalInvoiceAmount = userInvoices.get(targetUser.id) || 0;
    const invoiceCount = userInvoiceCounts.get(targetUser.id) || 0;

    const shiftEarnings = totalHours * SALARY_CONFIG.HOURLY_RATE;
    const invoiceEarnings = (totalInvoiceAmount * SALARY_CONFIG.INVOICE_PERCENT) / 100;
    const totalEarnings = shiftEarnings + invoiceEarnings;

    const hours = Math.floor(totalHours);
    const minutes = Math.floor((accumulatedMs % (1000 * 60 * 60)) / (1000 * 60));

    const resultEmbed = new EmbedBuilder()
      .setTitle(`💰 Maaş ve Hakediş Raporu`)
      .setColor('#00ff00')
      .setDescription(`${targetUser} kullanıcısının güncel hakediş detayları:`)
      .addFields(
        { name: '⏱️ Toplam Mesai', value: `${hours} saat ${minutes} dakika`, inline: true },
        { name: '📝 Fatura Sayısı / Tutar', value: `${invoiceCount} adet ($${totalInvoiceAmount})`, inline: true },
        { name: '💵 Mesai Kazancı', value: `$${shiftEarnings.toFixed(2)}`, inline: true },
        { name: `💵 Fatura Primi (%${SALARY_CONFIG.INVOICE_PERCENT})`, value: `$${invoiceEarnings.toFixed(2)}`, inline: true },
        { name: '🏆 Toplam Alacak Maaş', value: `**$${totalEarnings.toFixed(2)}**`, inline: false }
      )
      .setTimestamp();

    return message.reply({ embeds: [resultEmbed] });
  }

  if (command === '!mesai-ekle') {
    const targetUser = message.mentions.users.first();
    const addMinutes = parseInt(args[2]);

    if (!targetUser || isNaN(addMinutes) || addMinutes <= 0) {
      return message.reply('❌ **Hatalı kullanım!** Örnek: `!mesai-ekle @Kullanıcı 60`');
    }

    const addMs = addMinutes * 60 * 1000;
    const currentTotal = totalShifts.get(targetUser.id) || 0;
    totalShifts.set(targetUser.id, currentTotal + addMs);

    return message.reply(`✅ ${targetUser} kullanıcısının mesai süresine **${addMinutes} dakika** eklendi.`);
  }

  if (command === '!mesai-cikar') {
    const targetUser = message.mentions.users.first();
    const removeMinutes = parseInt(args[2]);

    if (!targetUser || isNaN(removeMinutes) || removeMinutes <= 0) {
      return message.reply('❌ **Hatalı kullanım!** Örnek: `!mesai-cikar @Kullanıcı 30`');
    }

    const removeMs = removeMinutes * 60 * 1000;
    const currentTotal = totalShifts.get(targetUser.id) || 0;
    const newTotal = Math.max(0, currentTotal - removeMs);
    totalShifts.set(targetUser.id, newTotal);

    return message.reply(`🛑 ${targetUser} kullanıcısının mesai süresinden **${removeMinutes} dakika** çıkarıldı.`);
  }

  if (command === '!fatura-sıfırla' || command === '!fatura-sifirla') {
    const targetUser = message.mentions.users.first();
    const param = args[1]?.toLowerCase();

    if (param === 'hepsi' || param === 'tümü' || param === 'tumu') {
      userInvoices.clear();
      userInvoiceCounts.clear();
      return message.reply('✅ **Tüm kullanıcıların fatura verileri ve sayıları başarıyla sıfırlandı.**');
    }

    if (targetUser) {
      userInvoices.delete(targetUser.id);
      userInvoiceCounts.delete(targetUser.id);
      return message.reply(`✅ ${targetUser} kullanıcısının tüm fatura verileri başarıyla sıfırlandı.`);
    }

    return message.reply('❌ **Hatalı kullanım!**\n• Belirli bir üye için: `!fatura-sıfırla @Kullanıcı`\n• Tüm sunucu için: `!fatura-sıfırla hepsi`');
  }

  if (command === '!fatura-sil' || command === '!fatura-cikar') {
    const targetUser = message.mentions.users.first();
    const removeAmount = parseFloat(args[2]);

    if (!targetUser || isNaN(removeAmount) || removeAmount <= 0) {
      return message.reply('❌ **Hatalı kullanım!** Örnek: `!fatura-sil @Kullanıcı 5000`');
    }

    const currentAmount = userInvoices.get(targetUser.id) || 0;
    const currentCount = userInvoiceCounts.get(targetUser.id) || 0;

    const newAmount = Math.max(0, currentAmount - removeAmount);
    const newCount = Math.max(0, currentCount - 1);

    userInvoices.set(targetUser.id, newAmount);
    userInvoiceCounts.set(targetUser.id, newCount);

    return message.reply(`✅ ${targetUser} kullanıcısından **$${removeAmount}** tutarında fatura düşüldü.\n• Güncel Fatura Tutarı: **$${newAmount}**\n• Güncel Fatura Adedi: **${newCount}**`);
  }
});

// ETKİLEŞİM DİNLEYİCİSİ (BUTONLAR & MODALLAR)
client.on('interactionCreate', async (interaction) => {

  // --- 1. BUTON TIKLAMALARI ---
  if (interaction.isButton()) {
    const { customId, user, guild } = interaction;
    
    // YENİ: DOKTOR MÜSAİTLİK BİLDİRİM FORMU
    if (customId === 'btn_musaitlik_bildir') {
      const modal = new ModalBuilder()
        .setCustomId('modal_musaitlik_bildir')
        .setTitle('Müsaitlik Bildirim Formu');

      const gunInput = new TextInputBuilder()
        .setCustomId('musait_gun')
        .setLabel('Hangi Gün Müsait Olacaksınız?')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: Bugün, Yarın, 25 Ekim Pazartesi vb.')
        .setRequired(true)
        .setMaxLength(50);

      const saatInput = new TextInputBuilder()
        .setCustomId('musait_saat')
        .setLabel('Müsait Olduğunuz Saat Aralığı')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: 14:00 - 18:00 arası')
        .setRequired(true)
        .setMaxLength(50);

      const polInput = new TextInputBuilder()
        .setCustomId('musait_poliklinik')
        .setLabel('Bulunacağınız Poliklinik / Birim')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: Genel Cerrahi Polikliniği')
        .setRequired(true)
        .setMaxLength(100);

      modal.addComponents(
        new ActionRowBuilder().addComponents(gunInput),
        new ActionRowBuilder().addComponents(saatInput),
        new ActionRowBuilder().addComponents(polInput)
      );

      await interaction.showModal(modal);
      return;
    }

    // RANDEVU ALMA BUTONU (Form açar)
    if (customId === 'btn_randevu_al') {
      const modal = new ModalBuilder()
        .setCustomId('modal_randevu_al')
        .setTitle('Randevu Formu');

      const isimInput = new TextInputBuilder()
        .setCustomId('randevu_isim')
        .setLabel('Adınız ve Soyadınız')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(50);

      const telefonInput = new TextInputBuilder()
        .setCustomId('randevu_telefon')
        .setLabel('IC Telefon Numaranız')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: 555-1234')
        .setRequired(true)
        .setMaxLength(15);

      const bolumInput = new TextInputBuilder()
        .setCustomId('randevu_bolum')
        .setLabel('Talep Edilen Bölüm / Doktor')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: Genel Cerrahi / Dr. John')
        .setRequired(true)
        .setMaxLength(100);

      const tarihInput = new TextInputBuilder()
        .setCustomId('randevu_tarih')
        .setLabel('Uygun Olduğunuz Tarih ve Saat')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: 25.10.2023 - 14:30')
        .setRequired(true)
        .setMaxLength(50);

      const sikayetInput = new TextInputBuilder()
        .setCustomId('randevu_sikayet')
        .setLabel('Şikayetiniz veya Mazeretiniz')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Şikayetinizi kısaca özetleyiniz...')
        .setRequired(true)
        .setMaxLength(500);

      modal.addComponents(
        new ActionRowBuilder().addComponents(isimInput),
        new ActionRowBuilder().addComponents(telefonInput),
        new ActionRowBuilder().addComponents(bolumInput),
        new ActionRowBuilder().addComponents(tarihInput),
        new ActionRowBuilder().addComponents(sikayetInput)
      );

      await interaction.showModal(modal);
      return;
    }

    // YETKİLİ RANDEVU ONAY / RED BUTONLARI (Form açar)
    if (customId.startsWith('btn_randevu_onay_') || customId.startsWith('btn_randevu_red_')) {
      if (interaction.message && interaction.message.components.length > 0) {
        const firstBtn = interaction.message.components[0].components[0];
        if (firstBtn && firstBtn.disabled) {
          return interaction.reply({
            content: '❌ **Bu randevu talebi zaten daha önce bir yetkili tarafından yanıtlanmış!**',
            ephemeral: true
          });
        }
      }

      const isApproved = customId.startsWith('btn_randevu_onay_');
      const parts = customId.split('_');
      const patientId = parts[parts.length - 2];
      const randevuId = parts[parts.length - 1];

      const modalCustomId = isApproved ? `modal_randevu_onay_${patientId}_${randevuId}` : `modal_randevu_red_${patientId}_${randevuId}`;

      const modal = new ModalBuilder()
        .setCustomId(modalCustomId)
        .setTitle(isApproved ? 'Randevu Onay Formu' : 'Randevu Red Formu');

      const reasonInput = new TextInputBuilder()
        .setCustomId('randevu_yanit_input')
        .setLabel(isApproved ? 'Onay Notu / Randevu Saati Teyidi' : 'Reddedilme Sebebi')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder(isApproved ? 'Örn: Randevunuz onaylanmıştır, belirtilen saatte Poliklinik 2 servisinde olunuz.' : 'Örn: İlgili poliklinik belirtilen saatte dolu.')
        .setRequired(true)
        .setMaxLength(500);

      modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
      await interaction.showModal(modal);
      return;
    }

    // --- AKADEMİ VEYA NORMAL PERSONEL MAZERET ONAY/RED BUTONU ---
    if (customId.startsWith('btn_mazeret_onay_') || customId.startsWith('btn_mazeret_red_') || customId.startsWith('btn_norm_mazeret_onay_') || customId.startsWith('btn_norm_mazeret_red_')) {
      
      if (interaction.message && interaction.message.components.length > 0) {
        const firstBtn = interaction.message.components[0].components[0];
        if (firstBtn && firstBtn.disabled) {
          return interaction.reply({
            content: '❌ **Bu mazeret talebi zaten daha önce bir yetkili tarafından yanıtlanmış!**',
            ephemeral: true
          });
        }
      }

      const isNormal = customId.startsWith('btn_norm_mazeret_');
      const actionType = customId.includes('_onay_') ? 'onay' : 'red';
      const parts = customId.split('_');
      const studentId = parts[parts.length - 2];
      const mazeretId = parts[parts.length - 1];

      const modalCustomId = isNormal ? `modal_norm_mazeret_${actionType}_${studentId}_${mazeretId}` : `modal_mazeret_${actionType}_${studentId}_${mazeretId}`;

      const modal = new ModalBuilder()
        .setCustomId(modalCustomId)
        .setTitle(actionType === 'onay' ? 'Mazeret Onay Sebebi' : 'Mazeret Red Sebebi');

      const reasonInput = new TextInputBuilder()
        .setCustomId('mazeret_sebep_input')
        .setLabel(actionType === 'onay' ? 'Onay Açıklaması / Notu' : 'Reddedilme Sebebi')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder(actionType === 'onay' ? 'Örn: Mazeretiniz uygun görüldü, izin tanımlandı.' : 'Örn: Mazeret bildirimi eksik veya yetersiz.')
        .setRequired(true)
        .setMaxLength(500);

      const firstActionRow = new ActionRowBuilder().addComponents(reasonInput);
      modal.addComponents(firstActionRow);

      await interaction.showModal(modal);
      return;
    }

    // --- MESAİ GİRİŞ ---
    if (customId === 'btn_mesai_giris') {
      if (activeShifts.has(user.id)) {
        return interaction.reply({ content: 'Zaten aktif bir mesainiz var!', ephemeral: true });
      }

      const checkTimer = setInterval(async () => {
        try {
          const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_mesai_devam').setLabel('Evet, Mesaideyim').setStyle(ButtonStyle.Primary)
          );

          try {
            await user.send({
              content: `⏰ **1 saattir mesaidesiniz. Hâlâ mesaide misiniz?**\n*30 dakika içinde aşağıdaki butona tıklamazsanız mesainiz otomatik sonlandırılacaktır.*`,
              components: [confirmRow]
            });
          } catch (dmErr) {
            if (interaction.channel) {
              await interaction.channel.send({
                content: `${user} (DM Kutunuz kapalı olduğu için buradan bildirildi)\n⏰ **1 saattir mesaidesiniz. Hâlâ mesaide misiniz?**\n*30 dakika içinde aşağıdaki butona tıklamazsanız mesainiz otomatik sonlandırılacaktır.*`,
                components: [confirmRow]
              });
            }
          }

          const timeoutTimer = setTimeout(async () => {
            if (activeShifts.has(user.id)) {
              const shift = activeShifts.get(user.id);
              clearInterval(shift.checkTimer);

              const durationMs = Date.now() - shift.startTime;
              const pastTotal = totalShifts.get(user.id) || 0;
              totalShifts.set(user.id, pastTotal + durationMs);

              activeShifts.delete(user.id);

              try {
                await user.send(`🛑 30 dakika boyunca yanıt vermediğiniz için mesainiz otomatik olarak sonlandırıldı.`);
              } catch (e) {}

              if (interaction.channel) {
                await interaction.channel.send(`🛑 ${user} 30 dakika boyunca yanıt vermediği için mesaisi otomatik olarak sonlandırıldı.`);
              }
            }
          }, 30 * 60 * 1000);

          const currentShift = activeShifts.get(user.id);
          if (currentShift) currentShift.timeoutTimer = timeoutTimer;

        } catch (err) {
          console.error('Mesai kontrol işlemi sırasında hata:', err);
        }
      }, 60 * 60 * 1000);

      activeShifts.set(user.id, {
        startTime: Date.now(),
        checkTimer: checkTimer,
        timeoutTimer: null
      });

      return interaction.reply({ content: '✅ **Mesaiye giriş yapıldı.** İyi çalışmalar! Kontroller DM üzerinden sağlanacaktır.', ephemeral: true });
    }

    // --- MESAİ DEVAM ONAYI ---
    if (customId === 'btn_mesai_devam') {
      const shift = activeShifts.get(user.id);
      if (!shift) {
        return interaction.reply({ content: 'Aktif bir mesainiz bulunmuyor.', ephemeral: true });
      }

      if (shift.timeoutTimer) {
        clearTimeout(shift.timeoutTimer);
        shift.timeoutTimer = null;
      }

      await interaction.reply({ content: '✅ **Mesaide olduğunuz doğrulandı.** İyi görevler!' });
    }

    // --- MESAİ ÇİKİŞ ---
    if (customId === 'btn_mesai_cikis') {
      if (!activeShifts.has(user.id)) {
        return interaction.reply({ content: 'Aktif bir mesainiz bulunmuyor!', ephemeral: true });
      }

      const shift = activeShifts.get(user.id);
      clearInterval(shift.checkTimer);
      if (shift.timeoutTimer) clearTimeout(shift.timeoutTimer);

      const durationMs = Date.now() - shift.startTime;
      const pastTotal = totalShifts.get(user.id) || 0;
      totalShifts.set(user.id, pastTotal + durationMs);

      activeShifts.delete(user.id);

      const minutes = Math.floor(durationMs / 60000);
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;

      return interaction.reply({ 
        content: `🛑 **Mesaiden çıkış yapıldı.** Bu oturumdaki süreniz: **${hours} saat ${remainingMinutes} dakika**.`, 
        ephemeral: true 
      });
    }

    // --- TOPLAM MESAİLERİM ---
    if (customId === 'btn_toplam_mesai') {
      let accumulatedMs = totalShifts.get(user.id) || 0;

      if (activeShifts.has(user.id)) {
        const shift = activeShifts.get(user.id);
        accumulatedMs += (Date.now() - shift.startTime);
      }

      const totalMinutes = Math.floor(accumulatedMs / 60000);
      const totalHours = Math.floor(totalMinutes / 60);
      const remainingMinutes = totalMinutes % 60;

      return interaction.reply({
        content: `📊 **Toplam Mesai Süreniz:** **${totalHours} saat ${remainingMinutes} dakika**.`,
        ephemeral: true
      });
    }

    // --- TÜM PERSONEL MESAİLERİ ---
    if (customId === 'btn_tum_mesailer') {
      const hasRole = interaction.member?.roles?.cache?.has(CONFIG.HASTANE_PERSONELI_ROLE_ID) || interaction.member?.permissions?.has(PermissionFlagsBits.Administrator);

      if (!hasRole) {
        return interaction.reply({
          content: '❌ **Bu işlem için Hastane Personeli yetkisine sahip olmalısınız!**',
          ephemeral: true
        });
      }

      const allUserIds = new Set([...totalShifts.keys(), ...activeShifts.keys()]);

      if (allUserIds.size === 0) {
        return interaction.reply({
          content: '📋 Henüz sistemde kayıtlı hiçbir mesai verisi bulunmuyor.',
          ephemeral: true
        });
      }

      let description = '';

      for (const userId of allUserIds) {
        let accumulatedMs = totalShifts.get(userId) || 0;
        const isCurrentlyActive = activeShifts.has(userId);

        if (isCurrentlyActive) {
          const shift = activeShifts.get(userId);
          accumulatedMs += (Date.now() - shift.startTime);
        }

        const totalMinutes = Math.floor(accumulatedMs / 60000);
        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;

        const statusText = isCurrentlyActive ? '🟢 *(Şu an mesaide)*' : '🔴 *(Mesaide değil)*';
        description += `<@${userId}> — **${totalHours} saat ${remainingMinutes} dakika** ${statusText}\n`;
      }

      const embed = new EmbedBuilder()
        .setTitle('📋 Tüm Personel Mesai Listesi')
        .setDescription(description)
        .setColor('#0099ff')
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // --- TİCKET OLUŞTURMA ---
    if (customId === 'btn_ticket_ac') {
      if (!guild) return;
      const channelName = `ticket-${user.username}`;
      
      if (guild.channels.cache.find(c => c.name === channelName)) {
        return interaction.reply({ content: 'Zaten açık bir biletiniz var.', ephemeral: true });
      }

      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: CONFIG.TICKET_CATEGORY_ID,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }
        ]
      });

      const closeBtn = new ButtonBuilder().setCustomId('btn_ticket_kapat').setLabel('Ticket Kapat').setStyle(ButtonStyle.Danger);
      const closeRow = new ActionRowBuilder().addComponents(closeBtn);

      await ticketChannel.send({ 
        content: `Merhaba ${user}, yetkililer kısa süre içinde sizinle ilgilenecektir.`, 
        components: [closeRow] 
      });

      return interaction.reply({ content: `Talebiniz oluşturuldu: ${ticketChannel}`, ephemeral: true });
    }

    // --- TİCKET KAPATMA ---
    if (customId === 'btn_ticket_kapat') {
      await interaction.reply('Ticket 5 saniye içinde kapatılıyor...');
      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 5000);
    }
  }

  // --- 2. MODAL (FORM) GÖNDERİMLERİ ---
  if (interaction.isModalSubmit()) {
    const { customId, user, guild } = interaction;
    
    // YENİ: MÜSAİTLİK FORMUNUN YANITLANMASI
    if (customId === 'modal_musaitlik_bildir') {
      const gun = interaction.fields.getTextInputValue('musait_gun');
      const saat = interaction.fields.getTextInputValue('musait_saat');
      const pol = interaction.fields.getTextInputValue('musait_poliklinik');

      const targetGuild = guild || client.guilds.cache.get(CONFIG.GUILD_ID) || client.guilds.cache.first();
      const channel = targetGuild?.channels.cache.get(CONFIG.DOKTOR_MUSAITLIK_CHANNEL_ID);

      if (!channel) {
        return interaction.reply({ content: '❌ Müsaitlik kanalı bulunamadı. Lütfen yöneticilere bildiriniz.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('🟢 Doktor Müsaitlik Bildirimi')
        .setColor('#00ff00')
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: '👨‍⚕️ Doktor', value: `${user}`, inline: true },
          { name: '🏥 Birim/Poliklinik', value: pol, inline: true },
          { name: '📅 Müsait Olunan Gün', value: gun, inline: false },
          { name: '🕒 Saat Aralığı', value: saat, inline: false }
        )
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
         new ButtonBuilder()
           .setCustomId('disabled_musaitlik_bilgi')
           .setLabel('Aktif Müsaitlik')
           .setStyle(ButtonStyle.Secondary)
           .setDisabled(true)
           .setEmoji('🩺')
      );

      try {
        await channel.send({ embeds: [embed], components: [row] });
        return interaction.reply({ content: '✅ Müsaitlik durumunuz hastalar ve yönetim için başarıyla paylaşıldı.', ephemeral: true });
      } catch (err) {
        console.error('Müsaitlik gönderilirken hata:', err);
        return interaction.reply({ content: '❌ Müsaitlik bildirilirken bir hata oluştu.', ephemeral: true });
      }
    }

    // RANDEVU FORMUNUN YANITLANMASI (VATANDAŞ TARAFINDAN GÖNDERİLEN)
    if (customId === 'modal_randevu_al') {
      const isim = interaction.fields.getTextInputValue('randevu_isim');
      const telefon = interaction.fields.getTextInputValue('randevu_telefon');
      const bolum = interaction.fields.getTextInputValue('randevu_bolum');
      const tarih = interaction.fields.getTextInputValue('randevu_tarih');
      const sikayet = interaction.fields.getTextInputValue('randevu_sikayet');
      const randevuId = Date.now().toString().slice(-6);

      const targetGuild = guild || client.guilds.cache.get(CONFIG.GUILD_ID) || client.guilds.cache.first();
      const randevuKanal = targetGuild?.channels.cache.get(CONFIG.RANDEVU_LOG_CHANNEL_ID);

      if (!randevuKanal) {
        return interaction.reply({ 
          content: '❌ **Randevu kanalı bulunamadı.** Sistem yöneticisine bildiriniz (RANDEVU_LOG_CHANNEL_ID eksik).', 
          ephemeral: true 
        });
      }

      const randevuEmbed = new EmbedBuilder()
        .setTitle('📅 Yeni Randevu Talebi')
        .setColor('#0099ff')
        .addFields(
          { name: '👤 Hasta Bilgisi', value: `${isim} (${user})\n📞 **Tel:** ${telefon}`, inline: false },
          { name: '🏥 İstenilen Bölüm / Doktor', value: bolum, inline: true },
          { name: '🕒 Talep Edilen Tarih', value: tarih, inline: true },
          { name: '📝 Şikayet / Detay', value: sikayet, inline: false }
        )
        .setFooter({ text: `Randevu ID: ${randevuId}` })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`btn_randevu_onay_${user.id}_${randevuId}`)
          .setLabel('Randevuyu Onayla')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`btn_randevu_red_${user.id}_${randevuId}`)
          .setLabel('Randevuyu Reddet')
          .setStyle(ButtonStyle.Danger)
      );

      try {
        await randevuKanal.send({ content: `📌 **Yeni bir randevu talebi ulaştı!** ${user}`, embeds: [randevuEmbed], components: [row] });
        return interaction.reply({ content: '✅ Randevu talebiniz başarıyla alındı ve yetkililere iletildi. Geçmiş olsun!', ephemeral: true });
      } catch (err) {
        console.error('Randevu loglanırken hata:', err);
        return interaction.reply({ content: '❌ Randevunuz iletilirken bir sorun oluştu.', ephemeral: true });
      }
    }

    // YETKİLİNİN RANDEVUYU ONAYLAMASI VEYA REDDETMESİ
    if (customId.startsWith('modal_randevu_onay_') || customId.startsWith('modal_randevu_red_')) {
      const isApproved = customId.startsWith('modal_randevu_onay_');
      const parts = customId.split('_');
      const patientId = parts[parts.length - 2];
      const randevuId = parts[parts.length - 1];
      const note = interaction.fields.getTextInputValue('randevu_yanit_input');

      const targetGuild = guild || client.guilds.cache.get(CONFIG.GUILD_ID) || client.guilds.cache.first();
      if (!targetGuild) return interaction.reply({ content: '❌ Sunucuya erişilemedi.', ephemeral: true });

      try {
        const patientUser = await client.users.fetch(patientId);

        const color = isApproved ? '#00ff00' : '#ff0000';
        const statusTitle = isApproved ? '✅ RANDEVU ONAYLANDI' : '❌ RANDEVU REDDEDİLDİ';

        // HASTAYA DM GÖNDERİMİ
        const patientDmEmbed = new EmbedBuilder()
          .setTitle(`🏥 Randevu Talebiniz ${isApproved ? 'Onaylandı' : 'Reddedildi'}`)
          .setColor(color)
          .addFields(
            { name: 'İlgilenen Yetkili / Doktor', value: `${user.tag}`, inline: true },
            { name: 'Durum', value: isApproved ? '✅ Randevunuz Kesinleşti' : '❌ Randevunuz Oluşturulamadı', inline: true },
            { name: isApproved ? 'Randevu Notu / Açıklama' : 'Red Sebebi', value: note, inline: false }
          )
          .setTimestamp();

        await patientUser.send({ embeds: [patientDmEmbed] }).catch(() => {});

        // LOG KANALINDA BUTONLARI DEVRE DIŞI BIRAK VE EMBED'İ GÜNCELLE
        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('disabled_randevu_status')
            .setLabel(`${statusTitle} (${user.username})`)
            .setStyle(isApproved ? ButtonStyle.Success : ButtonStyle.Danger)
            .setDisabled(true)
        );

        const logChannel = targetGuild.channels.cache.get(CONFIG.RANDEVU_LOG_CHANNEL_ID);
        if (logChannel) {
          const fetchedMsgs = await logChannel.messages.fetch({ limit: 50 });
          const logMsg = fetchedMsgs.find(m => m.embeds.length > 0 && m.embeds[0].footer?.text?.includes(randevuId));

          if (logMsg) {
            const updatedEmbed = EmbedBuilder.from(logMsg.embeds[0])
              .setColor(color)
              .addFields(
                { name: '⚡ İşlem Durumu', value: `**${statusTitle}** (${user.tag})`, inline: true },
                { name: isApproved ? 'Onay Notu' : 'Gerekçe', value: note, inline: false }
              );

            await logMsg.edit({ embeds: [updatedEmbed], components: [disabledRow] });
          }
        }

        return interaction.reply({
          content: `✅ Randevu talebi başarıyla **${isApproved ? 'ONAYLANDI' : 'REDDEDİLDİ'}**.\n**Not/Gerekçe:** ${note}`,
          ephemeral: true
        });

      } catch (err) {
        console.error('Randevu onay/red modal hatası:', err);
        return interaction.reply({ content: '❌ İşlem gerçekleştirilirken bir hata oluştu.', ephemeral: true });
      }
    }

    if (customId.startsWith('modal_mazeret_') || customId.startsWith('modal_norm_mazeret_')) {
      const isNormal = customId.startsWith('modal_norm_mazeret_');
      const parts = customId.split('_');
      const actionType = parts[parts.length - 3];
      const studentId = parts[parts.length - 2];
      const mazeretId = parts[parts.length - 1];
      const reason = interaction.fields.getTextInputValue('mazeret_sebep_input');

      const targetGuild = guild || client.guilds.cache.get(CONFIG.GUILD_ID) || client.guilds.cache.first();
      if (!targetGuild) {
        return interaction.reply({ content: '❌ Sunucuya erişilemedi.', ephemeral: true });
      }

      try {
        const targetMember = await targetGuild.members.fetch(studentId);

        const isApproved = actionType === 'onay';
        const color = isApproved ? '#00ff00' : '#ff0000';
        const statusTitle = isApproved ? '✅ ONAYLANDI' : '❌ REDDEDİLDİ';

        if (isApproved) {
          const izinliRole = targetGuild.roles.cache.get(CONFIG.IZINLI_PERSONEL_ROLE_ID);
          if (izinliRole && !targetMember.roles.cache.has(izinliRole.id)) {
            await targetMember.roles.add(izinliRole);
          }
        }

        // PERSONELE DM BİLDİRİMİ GÖNDER
        const userDmEmbed = new EmbedBuilder()
          .setTitle(isNormal ? `📋 Personel Mazeret Bildiriminiz ${isApproved ? 'Onaylandı' : 'Reddedildi'}` : `📑 Akademi Ders Mazeret Bildiriminiz ${isApproved ? 'Onaylandı' : 'Reddedildi'}`)
          .setColor(color)
          .addFields(
            { name: 'Değerlendiren Yetkili', value: `${user.tag}`, inline: true },
            { name: 'Verilen Karar', value: isApproved ? '✅ Mazeretiniz Kabul Edildi & İzinli Tanımlandı' : '❌ Mazeretiniz Reddedildi', inline: false },
            { name: isApproved ? 'Açıklama / Not' : 'Reddedilme Sebebi', value: reason, inline: false }
          )
          .setTimestamp();

        await targetMember.send({ embeds: [userDmEmbed] }).catch(() => {});

        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('disabled_status')
            .setLabel(`${statusTitle} (${user.username})`)
            .setStyle(isApproved ? ButtonStyle.Success : ButtonStyle.Danger)
            .setDisabled(true)
        );

        // LOG KANALINDAKİ MESAJI GÜNCELLE
        const targetLogChannelId = isNormal ? CONFIG.NORMAL_MAZERET_LOG_CHANNEL_ID : CONFIG.MAZERET_LOG_CHANNEL_ID;
        const logChannel = targetGuild.channels.cache.get(targetLogChannelId);
        if (logChannel) {
          try {
            const fetchedLogMsgs = await logChannel.messages.fetch({ limit: 50 });
            const logMsg = fetchedLogMsgs.find(m => m.embeds.length > 0 && m.embeds[0].footer?.text?.includes(mazeretId));

            if (logMsg) {
              const updatedLogEmbed = EmbedBuilder.from(logMsg.embeds[0])
                .setColor(color)
                .addFields(
                  { name: '⚡ Durum', value: `**${statusTitle}** (${user.tag})`, inline: true },
                  { name: isApproved ? 'Açıklama' : 'Gerekçe / Nedeni', value: reason, inline: false }
                );

              await logMsg.edit({ embeds: [updatedLogEmbed], components: [disabledRow] });
            }
          } catch (e) {
            console.error('Log kanalı güncellenirken hata:', e);
          }
        }

        // EĞER AKADEMİ MAZERETİ İSE AKADEMİ SORUMLULARININ DM'LERİNİ DÜZELT
        if (!isNormal) {
          try {
            const akademiSorumlulari = targetGuild.members.cache.filter(m => 
              m.roles.cache.has(CONFIG.AKADEMI_SORUMLUSU_ROLE_ID) && !m.user.bot
            );

            for (const [id, sorumluMember] of akademiSorumlulari) {
              try {
                const dmChannel = await sorumluMember.createDM();
                const dmMessages = await dmChannel.messages.fetch({ limit: 20 });
                const targetDmMsg = dmMessages.find(m => m.embeds.length > 0 && m.embeds[0].footer?.text?.includes(mazeretId));

                if (targetDmMsg) {
                  const updatedDmEmbed = EmbedBuilder.from(targetDmMsg.embeds[0])
                    .setColor(color)
                    .addFields(
                      { name: '⚡ Durum', value: `**${statusTitle}** (${user.tag})`, inline: true },
                      { name: isApproved ? 'Açıklama' : 'Gerekçe / Nedeni', value: reason, inline: false }
                    );

                  await targetDmMsg.edit({ embeds: [updatedDmEmbed], components: [disabledRow] });
                }
              } catch (dmErr) {}
            }
          } catch (e) {
            console.error('DM güncellemeleri yapılırken hata:', e);
          }
        }

        return interaction.reply({
          content: `✅ Mazeret talebi başarıyla **${isApproved ? 'ONAYLANDI' : 'REDDEDİLDİ'}**.\n**Gerekçe:** ${reason}`,
          ephemeral: true
        });

      } catch (err) {
        console.error('Mazeret modal işlemi hatası:', err);
        return interaction.reply({ content: '❌ İşlem gerçekleştirilirken bir hata oluştu.', ephemeral: true });
      }
    }
  }
});
process.on('unhandledRejection', error => {
    console.error('Yakalanmayan Hata:', error);
});
process.on('uncaughtException', error => {
    console.error('Kritik Sistem Hatası:', error);
});
client.login(CONFIG.TOKEN);
