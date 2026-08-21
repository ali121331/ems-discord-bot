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
  IMAGE_URL: 'https://cdn.discordapp.com/attachments/1180199538590482514/1540113722423648296/b9fc56e01dcdcce0d228c2271e0b9d0f.png?ex=6a88c62d&is=6a8774ad&hm=bf28ee6d771310a03c1162da6e49190a577dd720c3699289c1df467211dc72b9&'
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

// BUTON ETKİLEŞİMLERİ
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const { customId, user, guild, channel, member } = interaction;

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

        let dmSent = true;
        let targetDestination = user;

        // Önce DM atmayı dener, DM kapalıysa kanala atar
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

            // DM'den bilgi mesajı
            try {
              await user.send(`🛑 30 dakika boyunca yanıt vermediğiniz için mesainiz otomatik olarak sonlandırıldı.`);
            } catch (e) {}

            // Kanala bilgi mesajı
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

  // --- MESAİ DEVAM ONAYI (DM veya Kanaldaki Butondan) ---
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
