const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  PermissionFlagsBits, 
  ChannelType,
  REST,
  Routes,
  SlashCommandBuilder
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
    GatewayIntentBits.MessageContent
  ]
});

const CONFIG = {
  TOKEN: process.env.TOKEN || 'MTU0MDI1MjcyMjc4NjM0NTA0Mg.GD77TF.QVe1dbKUrLiNN4_kZ1iRWP_lQtJE-UJOe_OQ7U',
  VATANDAS_ROLE_ID: '1463553957019521208',
  WELCOME_CHANNEL_ID: '1463553957468180700',
  TICKET_CATEGORY_ID: '1540114356329517096',
  IMAGE_URL: 'https://cdn.discordapp.com/attachments/1180199538590482514/1540113722423648296/b9fc56e01dcdcce0d228c2271e0b9d0f.png?ex=6a88c62d&is=6a8774ad&hm=bf28ee6d771310a03c1162da6e49190a577dd720c3699289c1df467211dc72b9&'
};

const activeShifts = new Map();
const totalShifts = new Map();

// --- SLASH KOMUT TANIMLARI ---
const commands = [
  new SlashCommandBuilder()
    .setName('kur-mesai')
    .setDescription('EMS Mesai Takip Panelini kanala kurar.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('kur-ticket')
    .setDescription('Destek / Ticket Panelini kanala kurar.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('mesai-ekle')
    .setDescription('Bir kullanıcının mesai süresine dakika ekler.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true))
    .addIntegerOption(opt => opt.setName('dakika').setDescription('Dakika').setRequired(true)),

  new SlashCommandBuilder()
    .setName('mesai-cikar')
    .setDescription('Bir kullanıcının mesai süresinden dakika çıkarır.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true))
    .addIntegerOption(opt => opt.setName('dakika').setDescription('Dakika').setRequired(true))
];

client.once('ready', async () => {
  console.log(`[BOT] ${client.user.tag} aktif!`);

  const rest = new REST({ version: '10' }).setToken(CONFIG.TOKEN);
  try {
    console.log('Slash komutları güncelleniyor...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands.map(c => c.toJSON()) }
    );
    console.log('Slash komutları başarıyla kaydedildi!');
  } catch (error) {
    console.error('Slash komut kayıt hatası:', error);
  }
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

// --- INTERACTION HANDLER ---
client.on('interactionCreate', async (interaction) => {
  
  if (interaction.isChatInputCommand()) {
    const { commandName, options } = interaction;

    if (commandName === 'kur-mesai') {
      const embed = new EmbedBuilder()
        .setTitle('🚑 EMS Mesai Takip Paneli')
        .setDescription('Mesai işlemlerinizi ve geçmiş toplam mesai sürenizi aşağıdaki butonlardan yönetebilirsiniz.')
        .setColor('#ff0000')
        .setImage(CONFIG.IMAGE_URL);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_mesai_giris').setLabel('Mesai Giriş').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn_mesai_cikis').setLabel('Mesai Çıkış').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('btn_toplam_mesai').setLabel('Toplam Mesailerim').setStyle(ButtonStyle.Secondary)
      );

      await interaction.channel.send({ embeds: [embed], components: [row] });
      return interaction.reply({ content: '✅ Mesai paneli başarıyla kuruldu.', ephemeral: true });
    }

    if (commandName === 'kur-ticket') {
      const embed = new EmbedBuilder()
        .setTitle('🎫 Destek / Ticket Sistemi')
        .setDescription('Yetkililerle iletişime geçmek için aşağıdaki butona tıklayarak talep oluşturabilirsiniz.')
        .setColor('#00ff00');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_ticket_ac').setLabel('Ticket Oluştur').setStyle(ButtonStyle.Primary)
      );

      await interaction.channel.send({ embeds: [embed], components: [row] });
      return interaction.reply({ content: '✅ Ticket paneli başarıyla kuruldu.', ephemeral: true });
    }

    if (commandName === 'mesai-ekle') {
      const targetUser = options.getUser('kullanici');
      const addMinutes = options.getInteger('dakika');
      const addMs = addMinutes * 60 * 1000;

      const currentTotal = totalShifts.get(targetUser.id) || 0;
      totalShifts.set(targetUser.id, currentTotal + addMs);

      return interaction.reply({ 
        content: `✅ ${targetUser} kullanıcısının mesai süresine **${addMinutes} dakika** eklendi.`, 
        ephemeral: true 
      });
    }

    if (commandName === 'mesai-cikar') {
      const targetUser = options.getUser('kullanici');
      const removeMinutes = options.getInteger('dakika');
      const removeMs = removeMinutes * 60 * 1000;

      const currentTotal = totalShifts.get(targetUser.id) || 0;
      const newTotal = Math.max(0, currentTotal - removeMs);
      totalShifts.set(targetUser.id, newTotal);

      return interaction.reply({ 
        content: `🛑 ${targetUser} kullanıcısının mesai süresinden **${removeMinutes} dakika** düşüldü.`, 
        ephemeral: true 
      });
    }
  }

  if (interaction.isButton()) {
    const { customId, user, guild, channel } = interaction;

    if (customId === 'btn_mesai_giris') {
      if (activeShifts.has(user.id)) {
        return interaction.reply({ content: 'Zaten aktif bir mesainiz var!', ephemeral: true });
      }

      const checkTimer = setInterval(async () => {
        try {
          const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_mesai_devam').setLabel('Evet, Mesaideyim').setStyle(ButtonStyle.Primary)
          );

          const checkMsg = await channel.send({
            content: `${user} ⏰ **1 saattir mesaidesiniz. Hâlâ mesaide misiniz?**\n*30 dakika içinde aşağıdaki butona tıklamazsanız mesainiz otomatik sonlandırılacaktır.*`,
            components: [confirmRow]
          });

          const timeoutTimer = setTimeout(async () => {
            if (activeShifts.has(user.id)) {
              const shift = activeShifts.get(user.id);
              clearInterval(shift.checkTimer);

              const durationMs = Date.now() - shift.startTime;
              const pastTotal = totalShifts.get(user.id) || 0;
              totalShifts.set(user.id, pastTotal + durationMs);

              activeShifts.delete(user.id);

              await channel.send(`🛑 ${user} 30 dakika boyunca yanıt vermediği için mesaisi otomatik olarak sonlandırıldı.`);
              try { await checkMsg.delete(); } catch (e) {}
            }
          }, 30 * 60 * 1000);

          const currentShift = activeShifts.get(user.id);
          if (currentShift) currentShift.timeoutTimer = timeoutTimer;

        } catch (err) {
          console.error('Mesai kontrol mesajı gönderilemedi:', err);
        }
      }, 60 * 60 * 1000);

      activeShifts.set(user.id, {
        startTime: Date.now(),
        checkTimer: checkTimer,
        timeoutTimer: null
      });

      return interaction.reply({ content: '✅ **Mesaiye giriş yapıldı.** İyi çalışmalar!', ephemeral: true });
    }

    if (customId === 'btn_mesai_devam') {
      const shift = activeShifts.get(user.id);
      if (!shift) {
        return interaction.reply({ content: 'Aktif bir mesainiz bulunmuyor.', ephemeral: true });
      }

      if (shift.timeoutTimer) {
        clearTimeout(shift.timeoutTimer);
        shift.timeoutTimer = null;
      }

      await interaction.reply({ content: '✅ **Mesaide olduğunuz doğrulandı.** İyi görevler!', ephemeral: true });
      try { await interaction.message.delete(); } catch (e) {}
    }

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

      const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_ticket_kapat').setLabel('Ticket Kapat').setStyle(ButtonStyle.Danger)
      );

      await ticketChannel.send({ 
        content: `Merhaba ${user}, yetkililer kısa süre içinde sizinle ilgilenecektir.`, 
        components: [closeRow] 
      });

      return interaction.reply({ content: `Talebiniz oluşturuldu: ${ticketChannel}`, ephemeral: true });
    }

    if (customId === 'btn_ticket_kapat') {
      await interaction.reply('Ticket 5 saniye içinde kapatılıyor...');
      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 5000);
    }
  }
});

client.login(CONFIG.TOKEN);
