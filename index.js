const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  PermissionFlagsBits, 
  ChannelType 
} = require('discord.js');
const express = require('express');

// --- UPTIME WEB SUNUCUSU ---
const app = express();
app.get('/', (req, res) => res.send('EMS Bot 7/24 Aktif!'));
app.listen(3000, () => console.log('Uptime web sunucusu hazır.'));

// --- BOT YAPILANDIRMASI ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

const CONFIG = {
  TOKEN: process.env.TOKEN || 'MTU0MDI1MjcyMjc4NjM0NTA0Mg.GD77TF.QVe1dbKUrLiNN4_kZ1iRWP_lQtJE-UJOe_OQ7U',
  VATANDAS_ROLE_ID: '1463553957019521208',
  HASTANE_PERSONELI_ROLE_ID: '1463553957400940731',
  WELCOME_CHANNEL_ID: '1463553957468180700',
  TICKET_CATEGORY_ID: '1540114356329517096',
  KADRO_PANEL_CHANNEL_ID: '1540107816285511742',
  IMAGE_URL: 'https://cdn.discordapp.com/attachments/1180199538590482514/1540113722423648296/b9fc56e01dcdcce0d228c2271e0b9d0f.png?ex=6a88c62d&is=6a8774ad&hm=bf28ee6d771310a03c1162da6e49190a577dd720c3699289c1df467211dc72b9&',

  // GÖRSELLERDEKİ TÜM ROL ID'LERİ (Buradaki tırnak içine Discord'daki Rol ID'lerini gir)
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

// Veri depolama (Hafızada tutulur)
const activeShifts = new Map(); // Aktif mesailer
const totalShifts = new Map();  // Toplam mesai süreleri (ms cinsinden)

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
    content: `🚑Merhaba ${member} **EMERGENCY MEDICAL SERVICES**'e Hoşgeldin!\n🩺**EMS ekibine katıldın. Hazır ol, hayat kurtar ve görevini gururla yerine getir!**`,
    embeds: [welcomeEmbed]
  });
});

// ==========================================
// OTOMATİK KADRO PANELİ GÜNCELLEME (GÖRSELLERDEKİ TÜM ROLLER)
// ==========================================
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  if (oldMember.roles.cache.size === newMember.roles.cache.size) return;

  const kadroChannel = newMember.guild.channels.cache.get(CONFIG.KADRO_PANEL_CHANNEL_ID);
  if (!kadroChannel) return;

  try {
    await newMember.guild.members.fetch();

    // Görsellerdeki tam kategori ve rol sırası
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
        const membersWithRole = newMember.guild.members.cache.filter(m => m.roles.cache.has(roleObj.id));
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

    // Kanaldaki botun attığı eski mesajı günceller veya silip baştan atar
    const fetchedMessages = await kadroChannel.messages.fetch({ limit: 10 });
    const lastBotMessage = fetchedMessages.find(m => m.author.id === client.user.id);

    if (lastBotMessage) {
      await lastBotMessage.edit({ embeds: [kadroEmbed] });
    } else {
      await kadroChannel.send({ embeds: [kadroEmbed] });
    }

  } catch (err) {
    console.error('Kadro paneli güncellenirken hata oluştu:', err);
  }
});

// YÖNETİCİ KOMUTLARI (!kur-mesai, !kur-ticket, !mesai-ekle, !mesai-cikar)
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  // SADECE YÖNETİCİLER KULLANABİLİR
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

  const args = message.content.trim().split(/ +/);
  const command = args[0].toLowerCase();

  // 1. Mesai Paneli Kurma
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

  // 2. Ticket Paneli Kurma
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

  // 3. Kullanıcıya Mesai Ekleme (!mesai-ekle @Kullanici 60)
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

  // 4. Kullanıcıdan Mesai Düşme (!mesai-cikar @Kullanici 30)
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
});

// BUTON ETKİLEŞİMLERİ (MESAİ VE TİCKET İŞLEMLERİ)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const { customId, user, guild, channel, member } = interaction;

  // --- MESAİ GİRİŞ (1 Saat sonra DM kontrolü dahildir) ---
  if (customId === 'btn_mesai_giris') {
    if (activeShifts.has(user.id)) {
      return interaction.reply({ content: 'Zaten aktif bir mesainiz var!', ephemeral: true });
    }

    // Every 1 hour check
    const checkTimer = setInterval(async () => {
      try {
        const confirmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('btn_mesai_devam').setLabel('Evet, Mesaideyim').setStyle(ButtonStyle.Primary)
        );

        let dmSent = true;

        try {
          await user.send({
            content: `⏰ **1 saattir mesaidesiniz. Hâlâ mesaide misiniz?**\n*30 dakika içinde aşağıdaki butona tıklamazsanız mesainiz otomatik sonlandırılacaktır.*`,
            components: [confirmRow]
          });
        } catch (dmErr) {
          dmSent = false;
          if (channel) {
            await channel.send({
              content: `${user} (DM Kutunuz kapalı olduğu için buradan bildirildi)\n⏰ **1 saattir mesaidesiniz. Hâlâ mesaide misiniz?**\n*30 dakika içinde aşağıdaki butona tıklamazsanız mesainiz otomatik sonlandırılacaktır.*`,
              components: [confirmRow]
            });
          }
        }

        // 30 dakikalık onay bekleme süresi
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

            if (channel) {
              await channel.send(`🛑 ${user} 30 dakika boyunca yanıt vermediği için mesaisi otomatik olarak sonlandırıldı.`);
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

  // --- MESAİ ÇIKIŞ ---
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
    const hasRole = member?.roles?.cache?.has(CONFIG.HASTANE_PERSONELI_ROLE_ID) || member?.permissions?.has(PermissionFlagsBits.Administrator);

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
});

client.login(CONFIG.TOKEN);
