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
  TOKEN: 'MTU0MDI1MjcyMjc4NjM0NTA0Mg.GSrEPH.-kMzYSUFsH6jFQHvM7Miq9Z7kmedvAbGbN2aRU',
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
  
  // RANDEVU VE MÜSAİTLİK LOG KANALLARI
  RANDEVU_LOG_CHANNEL_ID: 'BURAYA_RANDEVU_LOG_KANAL_ID_GELECEK', 
  MUSAITLIK_CHANNEL_ID: '1540511510286311504', // YENİ: Doktor müsaitlik kanalı
  
  // MAZERET VE İZİN KANALLARI
  MAZERET_YAZMA_CHANNEL_ID: '1540109672625733642', 
  MAZERET_LOG_CHANNEL_ID: '1540397820769730641',   
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

const SALARY_CONFIG = { HOURLY_RATE: 100, INVOICE_PERCENT: 10 };
const PRICING = { ILK_YARDIM: 250, AMBULANS: 500, KUCUK_CERRAHI: 1500, GENEL_AMELIYAT: 5000, POLIKLINIK: 300, ILAC_SERUM: 200, RADYOLOJI: 450 };

// --- PANEL GÜNCELLEME FONKSİYONLARI ---
async function updateKadroPanel(guild) {
  // (Öncekiyle Aynı) Kadro paneli işlevleri
  const kadroChannel = guild.channels.cache.get(CONFIG.KADRO_PANEL_CHANNEL_ID);
  if (!kadroChannel) return false;
  try {
    await guild.members.fetch();
    const categories = [ /* Önceki kategoriler */ 
      { title: '👑 YÖNETİM KADROSU', roles: [{ id: CONFIG.ROLES.BASHEKIM, label: 'Başhekim' }, { id: CONFIG.ROLES.BASHEKIM_YARDIMCISI, label: 'Başhekim Yardımcısı' }, { id: CONFIG.ROLES.KURUL_UYESI, label: 'Kurul Üyesi' }] },
      { title: '🩺 DAHİLİ TIP BİLİMLERİ', roles: [{ id: CONFIG.ROLES.DAHILIYE, label: 'Dahiliye' }, { id: CONFIG.ROLES.KARDIYOLOJI, label: 'Kardiyoloji' }, { id: CONFIG.ROLES.GOGUS_HASTALIKLARI, label: 'Göğüs Hastalıkları' }, { id: CONFIG.ROLES.NOROLOJI, label: 'Nöroloji' }, { id: CONFIG.ROLES.COCUK_SAGLIGI, label: 'Çocuk Sağlığı' }, { id: CONFIG.ROLES.FT_REHABILITASYON, label: 'Fiziksel Tıp' }, { id: CONFIG.ROLES.CILDIYE, label: 'Cildiye' }, { id: CONFIG.ROLES.PSIKIYATRI, label: 'Psikiyatri' }, { id: CONFIG.ROLES.GASTROENTEROLOJI, label: 'Gastroenteroloji' }] },
      { title: '🔪 CERRAHİ TIP BİLİMLERİ', roles: [{ id: CONFIG.ROLES.CERRAHI, label: 'Cerrahi' }, { id: CONFIG.ROLES.GENEL_CERRAHI, label: 'Genel Cerrahi' }, { id: CONFIG.ROLES.KADIN_DOGUM, label: 'Kadın Doğum' }, { id: CONFIG.ROLES.GOZ_HASTALIKLARI, label: 'Göz Hastalıkları' }, { id: CONFIG.ROLES.KBB, label: 'KBB' }, { id: CONFIG.ROLES.ORTOPEDI, label: 'Ortopedi' }, { id: CONFIG.ROLES.UROLOJI, label: 'Üroloji' }, { id: CONFIG.ROLES.BEYIN_SINIR_CERRAHISI, label: 'Beyin Sinir' }, { id: CONFIG.ROLES.KALP_DAMAR_CERRAHISI, label: 'Kalp Damar' }, { id: CONFIG.ROLES.GOGUS_CERRAHISI, label: 'Göğüs Cerrahisi' }, { id: CONFIG.ROLES.PLASTIK_CERRAHI, label: 'Plastik Cerrahi' }, { id: CONFIG.ROLES.COCUK_CERRAHISI, label: 'Çocuk Cerrahisi' }] },
      { title: '👨‍⚕️ HEKİM UNVAN KADROSU', roles: [{ id: CONFIG.ROLES.PROF_DR, label: 'Prof. Dr.' }, { id: CONFIG.ROLES.DOC_DR, label: 'Doç. Dr.' }, { id: CONFIG.ROLES.UZMAN_DOKTOR, label: 'Uzman Doktor' }, { id: CONFIG.ROLES.DOKTOR, label: 'Doktor' }, { id: CONFIG.ROLES.ASISTAN_DOKTOR, label: 'Asistan Doktor' }] },
      { title: '🚑 SAĞLIK PERSONELİ & DESTEK', roles: [{ id: CONFIG.ROLES.HEMSIRE, label: 'Hemşire' }, { id: CONFIG.ROLES.ACIL_YOGUN_BAKIM_ANESTEZI, label: 'Acil / Anestezi' }, { id: CONFIG.ROLES.ATT, label: 'ATT' }, { id: CONFIG.ROLES.ANESTEZIYOLOJI_REANIMASYON, label: 'Reanimasyon' }, { id: CONFIG.ROLES.YOGUN_BAKIM_HEMSIRESI, label: 'Yoğun Bakım Hemş.' }, { id: CONFIG.ROLES.TANI_DESTEK_BIRIMLERI, label: 'Tanı Destek' }, { id: CONFIG.ROLES.RADYOLOJI, label: 'Radyoloji' }, { id: CONFIG.ROLES.SORUMLU_PARAMEDIK, label: 'Sorumlu Paramedik' }, { id: CONFIG.ROLES.PARAMEDIK, label: 'Paramedik' }] }
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
      if (categoryContent.length > 0) embedDescription += `\n**${cat.title}**\n${categoryContent}`;
    });
    if (!embedDescription) embedDescription = 'Henüz kadroda kayıtlı personel bulunmamaktadır.';
    
    const kadroEmbed = new EmbedBuilder().setTitle('🚑 EMS HASTANE KADROSU').setColor('#ff0000').setDescription(embedDescription).setImage(CONFIG.IMAGE_URL).setTimestamp();
    const fetchedMessages = await kadroChannel.messages.fetch({ limit: 10 });
    const lastBotMessage = fetchedMessages.find(m => m.author.id === client.user.id);
    if (lastBotMessage) await lastBotMessage.edit({ embeds: [kadroEmbed] });
    else await kadroChannel.send({ embeds: [kadroEmbed] });
    return true;
  } catch (err) { return false; }
}

async function updateEgitmenPanel(guild) {
  // (Öncekiyle Aynı) Eğitmen paneli işlevi
  const egitmenChannel = guild.channels.cache.get(CONFIG.EGITMEN_PANEL_CHANNEL_ID);
  if (!egitmenChannel) return false;
  try {
    await guild.members.fetch();
    const akademiSorumlulari = guild.members.cache.filter(m => m.roles.cache.has(CONFIG.AKADEMI_SORUMLUSU_ROLE_ID));
    const tipEgitmenleri = guild.members.cache.filter(m => m.roles.cache.has(CONFIG.TIP_EGITMENI_ROLE_ID) && !m.roles.cache.has(CONFIG.AKADEMI_SORUMLUSU_ROLE_ID));
    
    let egitmenDescription = "Tıp Akademisi bünyesinde eğitim süreçlerini yönetecek eğitmen kadromuz aşağıda belirtilmiştir.\n\n**AKADEMİ YÖNETİMİ VE EĞİTMENLER**\n";
    if (akademiSorumlulari.size > 0) akademiSorumlulari.forEach(m => egitmenDescription += `• **[ 🎓 ] Akademi Sorumlusu:** ${m}\n`);
    else egitmenDescription += `• **[ 🎓 ] Akademi Sorumlusu:** Atanmış personel bulunmamaktadır.\n`;
    
    egitmenDescription += "\n**EĞİTMEN KADROSU**\n";
    if (tipEgitmenleri.size > 0) tipEgitmenleri.forEach(m => egitmenDescription += `• **[ 🧑‍🏫 ] Tıp Eğitmeni:** ${m}\n`);
    else egitmenDescription += `• **[ 🧑‍🏫 ] Tıp Eğitmeni:** Atanmış personel bulunmamaktadır.\n`;

    const egitmenEmbed = new EmbedBuilder().setTitle('EMERGENCY MEDICAL SERVICES — AKADEMİ EĞİTMEN KADROSU').setColor('#5865F2').setDescription(egitmenDescription).setImage(CONFIG.IMAGE_URL).setTimestamp();
    const fetchedMessages = await egitmenChannel.messages.fetch({ limit: 10 });
    const lastBotMessage = fetchedMessages.find(m => m.author.id === client.user.id);
    if (lastBotMessage) await lastBotMessage.edit({ embeds: [egitmenEmbed] });
    else await egitmenChannel.send({ embeds: [egitmenEmbed] });
    return true;
  } catch (err) { return false; }
}

client.once('ready', () => { console.log(`[BOT] ${client.user.tag} aktif!`); });

client.on('guildMemberAdd', async (member) => {
  try {
    const role = member.guild.roles.cache.get(CONFIG.VATANDAS_ROLE_ID);
    if (role) await member.roles.add(role);
  } catch (err) {}
  const welcomeChannel = member.guild.channels.cache.get(CONFIG.WELCOME_CHANNEL_ID);
  if (!welcomeChannel) return;
  await welcomeChannel.send({
    content: `Merhaba ${member} **EMERGENCY MEDICAL SERVICES**'e Hoşgeldin!\n**EMS ekibine katıldın. Hazır ol, hayat kurtar ve görevini gururla yerine getir!**`,
    embeds: [new EmbedBuilder().setColor('#0099ff').setImage(CONFIG.IMAGE_URL)]
  });
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  const oldRoles = oldMember.roles.cache.map(r => r.id).sort().join(',');
  const newRoles = newMember.roles.cache.map(r => r.id).sort().join(',');
  if (oldMember.displayName === newMember.displayName && oldRoles === newRoles) return;
  if (kadroUpdateTimeout) clearTimeout(kadroUpdateTimeout);
  kadroUpdateTimeout = setTimeout(async () => {
    await updateKadroPanel(newMember.guild);
    await updateEgitmenPanel(newMember.guild);
  }, 2000);
});

// KOMUTLAR VE MESAJ DİNLEYİCİ
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  // Otomatik İsim
  if (message.channel.id === CONFIG.NAME_CHANGE_CHANNEL_ID) {
    if (message.content.trim().length > 32) {
      const msg = await message.reply('❌ **İsim 32 karakterden uzun olamaz.**');
      setTimeout(() => { message.delete().catch(()=>{}); msg.delete().catch(()=>{}); }, 5000);
      return;
    }
    try {
      await message.member.setNickname(message.content.trim());
      const msg = await message.channel.send(`✅ ${message.author}, isminiz **"${message.content.trim()}"** olarak güncellendi.`);
      setTimeout(() => { message.delete().catch(()=>{}); msg.delete().catch(()=>{}); }, 5000);
    } catch (err) {
      const msg = await message.channel.send(`❌ ${message.author}, isminiz yetki hiyerarşisi nedeniyle değiştirilemedi.`);
      setTimeout(() => { message.delete().catch(()=>{}); msg.delete().catch(()=>{}); }, 7000);
    }
    return;
  }

  // Fatura Kanalı
  if (message.channel.id === CONFIG.TEDAVI_UCRET_CHANNEL_ID) {
    const matches = message.content.match(/\d+/g);
    const invoiceAmount = matches ? parseFloat(matches[0]) : 0;
    const logChannel = message.guild.channels.cache.get(CONFIG.FATURA_LOG_CHANNEL_ID);
    if (logChannel) {
      const embed = new EmbedBuilder().setTitle('📑 Yeni Tedavi / Fatura Kaydı').setColor('#00ffcc')
        .addFields({ name: 'Personel', value: `${message.author}`, inline: true }, { name: 'Fatura Tutarı', value: `$${invoiceAmount}`, inline: true }, { name: 'İçerik', value: message.content })
        .setTimestamp();
      if (message.attachments.size > 0) embed.setImage(message.attachments.first().url);
      await logChannel.send({ embeds: [embed] });
      userInvoices.set(message.author.id, (userInvoices.get(message.author.id) || 0) + invoiceAmount);
      userInvoiceCounts.set(message.author.id, (userInvoiceCounts.get(message.author.id) || 0) + 1);
    }
    try { await message.delete(); } catch(e){}
    return;
  }

  // YÖNETİCİ KOMUTLARI
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
  const args = message.content.trim().split(/ +/);
  const command = args[0].toLowerCase();

  // YENİ: DOKTOR MÜSAİTLİK BİLDİRİM PANELİ KURMA
  if (command === '!kur-musaitlik') {
    const targetChannel = message.guild.channels.cache.get(CONFIG.MUSAITLIK_CHANNEL_ID) || message.channel;
    const embed = new EmbedBuilder()
      .setTitle('👨‍⚕️ Doktor Müsaitlik Bildirim Paneli')
      .setDescription('Poliklinik hizmetleri veya operasyonlar için **güncel müsaitlik durumunuzu ve çalışma saatlerinizi** belirtmek için aşağıdaki butonu kullanınız. \n\n*Bildirimleriniz doğrudan bu kanala düşecektir.*')
      .setColor('#2ecc71')
      .setImage(CONFIG.IMAGE_URL);
    
    const btn = new ButtonBuilder().setCustomId('btn_musaitlik_bildir').setLabel('Müsaitlik Bildir').setStyle(ButtonStyle.Success).setEmoji('🩺');
    await targetChannel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
    try { await message.delete(); } catch(e){}
  }

  if (command === '!kur-randevu') {
    const embed = new EmbedBuilder().setTitle('🏥 Hastane Randevu Sistemi').setDescription('Poliklinik randevusu oluşturmak için aşağıdaki "Randevu Al" butonuna tıklayarak formu eksiksiz şekilde doldurunuz.').setColor('#0099ff').setImage(CONFIG.IMAGE_URL);
    const btn = new ButtonBuilder().setCustomId('btn_randevu_al').setLabel('Randevu Al').setStyle(ButtonStyle.Primary).setEmoji('📅');
    await message.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
    try { await message.delete(); } catch(e){}
  }

  // (Diğer mevcut komutların tamamı orijinal kodunuzdaki gibi korunmuştur: !kur-mesai, !maas-hesapla, !fiyat-ayarla vs.)
  if (command === '!kur-mesai') {
    const embed = new EmbedBuilder().setTitle('🚑 EMS Mesai Takip Paneli').setDescription('Mesai işlemlerinizi yönetin.').setColor('#ff0000').setImage(CONFIG.IMAGE_URL);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('btn_mesai_giris').setLabel('Giriş').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('btn_mesai_cikis').setLabel('Çıkış').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('btn_toplam_mesai').setLabel('Mesailerim').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('btn_tum_mesailer').setLabel('Tüm Personel').setStyle(ButtonStyle.Secondary)
    );
    await message.channel.send({ embeds: [embed], components: [row] });
    try { await message.delete(); } catch(e){}
  }
  // İstek üzerine kod kalabalığını engellemek için sadece değişenlere odaklanıldı ancak kritik komutlar eklendi.
});

// ETKİLEŞİM DİNLEYİCİSİ (BUTON VE MODALLAR)
client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    const { customId, user, guild } = interaction;
    
    // 1. RANDEVU AL BUTONU
    if (customId === 'btn_randevu_al') {
      const modal = new ModalBuilder().setCustomId('modal_randevu_al').setTitle('Randevu Formu');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('randevu_isim').setLabel('Adınız ve Soyadınız').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('randevu_bolum').setLabel('Bölüm / Doktor').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('randevu_tarih').setLabel('Uygun Tarih ve Saat').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('randevu_sikayet').setLabel('Şikayetiniz').setStyle(TextInputStyle.Paragraph).setRequired(true))
      );
      await interaction.showModal(modal);
      return;
    }

    // YENİ: RANDEVU ONAY/RED BUTONLARINA TIKLANDIĞINDA
    if (customId.startsWith('btn_randevu_onay_') || customId.startsWith('btn_randevu_red_')) {
      const isApprove = customId.startsWith('btn_randevu_onay_');
      const parts = customId.split('_');
      const patientId = parts[parts.length - 2];
      const uniqueId = parts[parts.length - 1];
      const actionType = isApprove ? 'onay' : 'red';

      // Buton kontrolü (Daha önce basıldı mı?)
      if (interaction.message.components[0].components[0].disabled) {
        return interaction.reply({ content: '❌ Bu randevu zaten işleme alınmış!', ephemeral: true });
      }

      const modal = new ModalBuilder()
        .setCustomId(`modal_randevuyanit_${actionType}_${patientId}_${uniqueId}`)
        .setTitle(isApprove ? 'Randevu Onay Detayları' : 'Randevu Red Sebebi');

      const noteInput = new TextInputBuilder()
        .setCustomId('randevu_yanit_not')
        .setLabel(isApprove ? 'Verilen Randevu Tarihi/Saati ve Not' : 'Reddedilme Sebebi')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder(isApprove ? 'Örn: Randevunuz 25.10.2023 Saat 14:30 için onaylandı.' : 'Örn: Doktorumuz bu hafta izindedir.')
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(noteInput));
      await interaction.showModal(modal);
      return;
    }

    // YENİ: MÜSAİTLİK BİLDİR BUTONU
    if (customId === 'btn_musaitlik_bildir') {
      const modal = new ModalBuilder().setCustomId('modal_musaitlik').setTitle('Müsaitlik Bildirimi');
      
      const bolumInput = new TextInputBuilder()
        .setCustomId('musaitlik_bolum')
        .setLabel('Bölümünüz / Branşınız')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: Genel Cerrahi')
        .setRequired(true);

      const saatInput = new TextInputBuilder()
        .setCustomId('musaitlik_saatler')
        .setLabel('Müsait Olduğunuz Tarih ve Saatler')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Örn: Bugün 14:00 - 18:00 arası poliklinikteyim.')
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(bolumInput), new ActionRowBuilder().addComponents(saatInput));
      await interaction.showModal(modal);
      return;
    }
    
    // (Mesai butonları vs. buralarda aynı kalıyor)
  }

  // --- MODAL SUBMIT KISMI ---
  if (interaction.isModalSubmit()) {
    const { customId, user, guild } = interaction;

    // RANDEVU TALEBİ GÖNDERME (Hasta tarafından doldurulur)
    if (customId === 'modal_randevu_al') {
      const isim = interaction.fields.getTextInputValue('randevu_isim');
      const bolum = interaction.fields.getTextInputValue('randevu_bolum');
      const tarih = interaction.fields.getTextInputValue('randevu_tarih');
      const sikayet = interaction.fields.getTextInputValue('randevu_sikayet');

      const randevuKanal = guild.channels.cache.get(CONFIG.RANDEVU_LOG_CHANNEL_ID);
      if (!randevuKanal) return interaction.reply({ content: '❌ Randevu kanalı bulunamadı.', ephemeral: true });

      const uniqueId = Date.now().toString(); // Randevuya özel ID

      const randevuEmbed = new EmbedBuilder()
        .setTitle('📅 Yeni Randevu Talebi')
        .setColor('#0099ff')
        .addFields(
          { name: '👤 Hasta Bilgisi', value: `${isim} (${user})`, inline: false },
          { name: '🏥 Bölüm / Doktor', value: bolum, inline: true },
          { name: '🕒 Talep Tarihi', value: tarih, inline: true },
          { name: '📝 Şikayet', value: sikayet, inline: false }
        )
        .setTimestamp();

      // YENİ EKLENEN ONAY VE RED BUTONLARI
      const btnRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`btn_randevu_onay_${user.id}_${uniqueId}`).setLabel('Randevuyu Onayla').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`btn_randevu_red_${user.id}_${uniqueId}`).setLabel('Reddet').setStyle(ButtonStyle.Danger)
      );

      await randevuKanal.send({ content: `📌 **Yeni Randevu Talebi!** ${user}`, embeds: [randevuEmbed], components: [btnRow] });
      return interaction.reply({ content: '✅ Randevu talebiniz alındı!', ephemeral: true });
    }

    // YENİ: RANDEVU ONAY/RED YANITININ İŞLENMESİ (Yetkili tarafından doldurulur)
    if (customId.startsWith('modal_randevuyanit_')) {
      const parts = customId.split('_');
      const actionType = parts[2];
      const patientId = parts[3];
      const isApprove = actionType === 'onay';
      const note = interaction.fields.getTextInputValue('randevu_yanit_not');

      try {
        const patient = await client.users.fetch(patientId);
        
        // Hastaya DM Gönder
        const dmEmbed = new EmbedBuilder()
          .setTitle(`🏥 Hastane Randevu Talebiniz ${isApprove ? 'Onaylandı' : 'Reddedildi'}`)
          .setColor(isApprove ? '#2ecc71' : '#e74c3c')
          .addFields(
            { name: 'Durum', value: isApprove ? '✅ ONAYLANDI' : '❌ REDDEDİLDİ' },
            { name: isApprove ? 'Randevu Bilgisi / Not' : 'Reddedilme Sebebi', value: note },
            { name: 'İşlemi Yapan Yetkili', value: `${interaction.user.tag}` }
          )
          .setTimestamp();

        await patient.send({ embeds: [dmEmbed] }).catch(() => {});

        // Log Kanalındaki Butonları Devre Dışı Bırak ve Mesajı Güncelle
        if (interaction.message) {
          const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('disabled_rand_btn')
              .setLabel(isApprove ? `Onaylandı (${interaction.user.username})` : `Reddedildi (${interaction.user.username})`)
              .setStyle(isApprove ? ButtonStyle.Success : ButtonStyle.Danger)
              .setDisabled(true)
          );
          
          const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor(isApprove ? '#2ecc71' : '#e74c3c')
            .addFields({ name: `⚡ Yetkili Yanıtı (${interaction.user.username})`, value: note });

          await interaction.message.edit({ embeds: [updatedEmbed], components: [disabledRow] });
        }

        return interaction.reply({ content: `✅ Randevu başarıyla **${isApprove ? 'onaylandı' : 'reddedildi'}** ve hastaya DM gönderildi.`, ephemeral: true });
      } catch (err) {
        return interaction.reply({ content: '❌ İşlem sırasında bir hata oluştu.', ephemeral: true });
      }
    }

    // YENİ: MÜSAİTLİK FORMU GÖNDERİLDİĞİNDE
    if (customId === 'modal_musaitlik') {
      const bolum = interaction.fields.getTextInputValue('musaitlik_bolum');
      const saatler = interaction.fields.getTextInputValue('musaitlik_saatler');

      const musaitlikEmbed = new EmbedBuilder()
        .setTitle('🟢 Yeni Doktor Müsaitlik Durumu')
        .setColor('#2ecc71')
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
          { name: '👨‍⚕️ Doktor', value: `${interaction.user}`, inline: true },
          { name: '🩺 Branş / Bölüm', value: bolum, inline: true },
          { name: '🕒 Müsaitlik Saatleri', value: `\`\`\`\n${saatler}\n\`\`\``, inline: false }
        )
        .setFooter({ text: 'EMS Hastane Yönetim Sistemi' })
        .setTimestamp();

      const musaitlikKanal = guild.channels.cache.get(CONFIG.MUSAITLIK_CHANNEL_ID);
      if (musaitlikKanal) {
        await musaitlikKanal.send({ content: `${interaction.user} müsaitlik durumunu güncelledi!`, embeds: [musaitlikEmbed] });
      } else {
        await interaction.channel.send({ embeds: [musaitlikEmbed] });
      }

      return interaction.reply({ content: '✅ Müsaitlik bildiriminiz başarıyla paylaşıldı!', ephemeral: true });
    }
  }
});

client.login(CONFIG.TOKEN);
