const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  PermissionFlagsBits, 
  ChannelType,
  Partials
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
  TOKEN: 'MTU0MTE0MzgzMTYxNDkyMTIzMA.G4mN8W.jU993H4A-83hSjXvQjHTh_eL7c5U0B8zX91k',
  VATANDAS_ROLE_ID: '1463553957019521208',
  HASTANE_PERSONELI_ROLE_ID: '1463553957400940731',
  WELCOME_CHANNEL_ID: '1463553957468180700',
  TICKET_CATEGORY_ID: '1540114356329517096',
  KADRO_PANEL_CHANNEL_ID: '1540107816285511742',
  TEDAVI_UCRET_CHANNEL_ID: '1540107777752563793',
  FATURA_LOG_CHANNEL_ID: '1540364891959988324',
  
  // MAZERET BİLDİRİM VE İZİN SİSTEMİ
  MAZERET_CHANNEL_ID: '1540109672625733642',
  AKADEMI_SORUMLUSU_ROLE_ID: '1540116919833722920',
  IZINLI_PERSONEL_ROLE_ID: '1463553957358993515',

  IMAGE_URL: 'https://cdn.discordapp.com/attachments/1180199538590482514/1540113722423648296/b9fc56e01dcdcce0d228c2271e0b9d0f.png?ex=6a88c62d&is=6a8774ad&hm=bf28ee6d771310a03c1162da6e49190a577dd720c3699289c1df467211dc72b9&',

  ROLES: {
    BASHEKIM: '1463553957468180696',
    BASHEKIM_YARDIMCISI: '1463553957451399268',
    KURUL_UYESI: '1540122702189174806',

    // Poliklinikler / Dahili Birimler
    DAHILIYE: '1540103435104559194',
    KARDIYOLOJI: '1540104110039371807',
    GOGUS_HASTALIKLARI: '1540104308056662107',
    NOROLOJI: '1540104445323386880',
    COCUK_SAGLIGI: '1540104582254825542',
    FT_REHABILITASYON: '1540104805026893936',
    CILDIYE: '1540105351683121232',
    PSIKIYATRI: '1540105642348650528',
    GASTROENTEROLOJI: '1540105830903324802',

    // Cerrahi Birimler
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

    // Unvanlar
    PROF_DR: '1540120277394915388',
    DOC_DR: '1540120457783681065',
    UZMAN_DOKTOR: '1463553957392547962',
    DOKTOR: '1463553957400940733',
    ASISTAN_DOKTOR: '1540120083018416228',

    // Saha ve Sağlık Ekipleri
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

// Veri depolama
const activeShifts = new Map();
const totalShifts = new Map();
const userInvoices = new Map(); 
const userInvoiceCounts = new Map(); 
let kadroUpdateTimeout = null;

// Mazeret takip haritası
const activeMazeretReplies = new Map(); 

// Dinamik Ücret ve Oran Ayarları
const SALARY_CONFIG = {
  HOURLY_RATE: 100,      
  INVOICE_PERCENT: 10    
};

// Dinamik Hizmet/Tedavi Fiyat Deposu
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
      embedDescription = 'Henüz kadroda aktif kayıtlı personel bulunmamaktadır.';
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

// OTOMATİK KADRO PANELİ GÜNCELLEME (DEBOUNCE)
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  if (oldMember.roles.cache.size === newMember.roles.cache.size) return;

  if (kadroUpdateTimeout) clearTimeout(kadroUpdateTimeout);

  kadroUpdateTimeout = setTimeout(async () => {
    await updateKadroPanel(newMember.guild);
  }, 5000);
});

// KANAL VE DM MESAJLARI DİNLEME
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // --- 1. DM CEVAPLAMA SİSTEMİ ---
  if (!message.guild) {
    const activeData = activeMazeretReplies.get(message.author.id);
    if (!activeData) {
      return message.reply('❌ Yanıtlamak istediğiniz aktif bir mazeret bildirimi bulunamadı veya süre doldu. Lütfen Discord sunucusundaki buton üzerinden işlemi başlatınız.');
    }

    try {
      const targetGuild = await client.guilds.fetch(activeData.guildId);
      const targetMember = await targetGuild.members.fetch(activeData.studentId);
      const izinliRole = targetGuild.roles.cache.get(CONFIG.IZINLI_PERSONEL_ROLE_ID);

      if (izinliRole && !targetMember.roles.cache.has(izinliRole.id)) {
        await targetMember.roles.add(izinliRole);
      }

      const userDmEmbed = new EmbedBuilder()
        .setTitle('📑 Ders Mazeret Bidiriminiz Yanıtlandı')
        .setColor('#00ff00')
        .addFields(
          { name: 'Yetkili / Sorumlu', value: `${message.author.tag}`, inline: true },
          { name: 'Verilen Karar', value: '✅ Mazeretiniz Kabul Edildi & İzinli Tanımlandı', inline: false },
          { name: 'Sorumlu Notu / Sebep', value: message.content || 'Bir açıklama belirtilmedi.' }
        )
        .setTimestamp();

      await targetMember.send({ embeds: [userDmEmbed] });

      await message.reply(`✅ **Yanıtınız başarıyla iletildi!**\n• **Personel:** ${targetMember.user.tag}\n• **Açıklama:** ${message.content}\n• **İzin Rolü:** Tanımlandı.`);

      activeMazeretReplies.delete(message.author.id);

    } catch (err) {
      console.error('DM yanıtı gönderilirken hata oluştu:', err);
      await message.reply('❌ Mesaj iletilirken veya rol verilirken bir hata oluştu.');
    }
    return;
  }

  // --- 2. DERS MAZERET BİLDİRİ KANALI İŞLEMLERİ ---
  if (message.channel.id === CONFIG.MAZERET_CHANNEL_ID) {
    const mazeretEmbed = new EmbedBuilder()
      .setTitle('📥 Yeni Ders Mazeret Bildirimi')
      .setColor('#ff9900')
      .addFields(
        { name: 'Gönderen Personel', value: `${message.author} (${message.author.tag})`, inline: true },
        { name: 'Personel ID', value: `${message.author.id}`, inline: true },
        { name: 'Mazeret Detayı', value: message.content || 'Görsel/Dosya Gönderildi' }
      )
      .setTimestamp();

    if (message.attachments.size > 0) {
      mazeretEmbed.setImage(message.attachments.first().url);
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`btn_mazeret_cevap_${message.author.id}`)
        .setLabel('DM üzerinden Cevapla & İzin Ver')
        .setStyle(ButtonStyle.Success)
    );

    const membersWithAkademiRole = message.guild.members.cache.filter(m => m.roles.cache.has(CONFIG.AKADEMI_SORUMLUSU_ROLE_ID));

    membersWithAkademiRole.forEach(async (sorumlu) => {
      try {
        await sorumlu.send({
          content: `🔔 **Akademi Sorumlusu:** <@${message.author.id}> tarafından yeni bir ders mazereti bildirildi!`,
          embeds: [mazeretEmbed],
          components:
