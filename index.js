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

// --- UPTIME WEB SUNUCUSU (7/24 Aktif Tutmak İçin) ---
const app = express();
app.get('/', (req, res) => res.send('EMS Bot 7/24 Aktif!'));
app.listen(3000, () => console.log('Uptime web sunucusu hazır.'));

// --- BOT YAPILANDIRMASI VE İNTENTLER ---
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
  IMAGE_URL: 'https://cdn.discordapp.com/attachments/1180199538590482514/1540113722423648296/b9fc56e01dcdcce0d228c2271e0b9d0f.png?ex=6a88c62d&is=6a8774ad&hm=bf28ee6d771310a03c1162da6e49190a577dd720c3699289c1df467211dc72b9&'
};

// Mesai verilerini hafızada tutmak için
const shiftData = new Map();

client.once('ready', () => {
  console.log(`[BOT] ${client.user.tag} başarıyla aktif edildi!`);
});

// --- 1. OTOMATİK ROL VE HOŞ GELDİN MESAJI ---
client.on('guildMemberAdd', async (member) => {
  // Vatandaş Rolü Verme
  try {
    const role = member.guild.roles.cache.get(CONFIG.VATANDAS_ROLE_ID);
    if (role) await member.roles.add(role);
  } catch (err) {
    console.error('Rol verme hatası:', err);
  }

  // Hoş Geldin Kanalına Görselli Mesaj Gönderme
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

// --- 2. KURULUM KOMUTLARI (!kur-mesai VE !kur-ticket) ---
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

  // Mesai Paneli Kurulumu
  if (message.content === '!kur-mesai') {
    const embed = new EmbedBuilder()
      .setTitle('🚑 EMS Mesai Takip Paneli')
      .setDescription('Mesaiye başlarken veya mesaiden çıkarken aşağıdaki butonları kullanabilirsiniz.')
      .setColor('#ff0000')
      .setImage(CONFIG.IMAGE_URL);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('btn_mesai_giris').setLabel('Mesai Giriş').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('btn_mesai_cikis').setLabel('Mesai Çıkış').setStyle(ButtonStyle.Danger)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
    await message.delete();
  }

  // Ticket Paneli Kurulumu
  if (message.content === '!kur-ticket') {
    const embed = new EmbedBuilder()
      .setTitle('🎫 Destek / Ticket Sistemi')
      .setDescription('Yetkililerle iletişime geçmek için aşağıdaki butona tıklayarak talep oluşturabilirsiniz.')
      .setColor('#00ff00');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('btn_ticket_ac').setLabel('Ticket Oluştur').setStyle(ButtonStyle.Primary)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
    await message.delete();
  }
});

// --- 3. BUTON ETKİLEŞİMLERİ (MESAİ & TİCKET) ---
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const { customId, user, guild } = interaction;

  // --- MESAİ GİRİŞ ---
  if (customId === 'btn_mesai_giris') {
    if (shiftData.has(user.id)) {
      return interaction.reply({ content: 'Zaten aktif bir mesainiz bulunuyor!', ephemeral: true });
    }
    shiftData.set(user.id, Date.now());
    return interaction.reply({ content: '✅ **Mesaiye giriş yapıldı.** İyi çalışmalar!', ephemeral: true });
  }

  // --- MESAİ ÇIKIŞ ---
  if (customId === 'btn_mesai_cikis') {
    if (!shiftData.has(user.id)) {
      return interaction.reply({ content: 'Aktif bir mesainiz bulunmuyor!', ephemeral: true });
    }
    const startTime = shiftData.get(user.id);
    const durationMs = Date.now() - startTime;
    const minutes = Math.floor(durationMs / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    shiftData.delete(user.id);
    return interaction.reply({ 
      content: `🛑 **Mesaiden çıkış yapıldı.** Toplam Mesai Süreniz: **${hours} saat ${remainingMinutes} dakika**.`, 
      ephemeral: true 
    });
  }

  // --- TİCKET OLUŞTURMA ---
  if (customId === 'btn_ticket_ac') {
    const channelName = `ticket-${user.username}`;
    
    const existingChannel = guild.channels.cache.find(c => c.name === channelName);
    if (existingChannel) {
      return interaction.reply({ content: `Zaten açık bir talebiniz var: ${existingChannel}`, ephemeral: true });
    }

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
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

  // --- TİCKET KAPATMA ---
  if (customId === 'btn_ticket_kapat') {
    await interaction.reply('Ticket 5 saniye içinde kapatılıyor...');
    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 5000);
  }
});

client.login(CONFIG.TOKEN);
