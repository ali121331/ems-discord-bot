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
app.get('/', (req, res) => res.send('Bot 7/24 Aktif!'));
app.listen(3000, () => console.log('Uptime sunucusu hazır.'));

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
  TOKEN: process.env.TOKEN, // Token'ı Render üzerindeki Environment Variables'tan çeker
  VATANDAS_ROLE_ID: '1463553957019521208',
  WELCOME_CHANNEL_ID: 'HOSGELDIN_KANAL_ID_BURAYA', // Mesajın gideceği kanal ID'si
  IMAGE_URL: 'GÖRSEL_LINKI_BURAYA' // Resim linki
};

const shiftData = new Map();

client.once('ready', () => {
  console.log(`[BOT] ${client.user.tag} aktif!`);
});

// Otomatik Rol ve Karşılama
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

// Kurulum Komutları
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

  if (message.content === '!kur-mesai') {
    const embed = new EmbedBuilder()
      .setTitle('🚑 EMS Mesai Takip Paneli')
      .setDescription('Mesaiye başlarken veya mesaiden çıkarken aşağıdaki butonları kullanabilirsiniz.')
      .setColor('#ff0000');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('btn_mesai_giris').setLabel('Mesai Giriş').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('btn_mesai_cikis').setLabel('Mesai Çıkış').setStyle(ButtonStyle.Danger)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
    await message.delete();
  }

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

// Buton Etkileşimleri
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const { customId, user, guild } = interaction;

  if (customId === 'btn_mesai_giris') {
    if (shiftData.has(user.id)) return interaction.reply({ content: 'Zaten aktif mesainiz var!', ephemeral: true });
    shiftData.set(user.id, Date.now());
    return interaction.reply({ content: '✅ **Mesaiye giriş yapıldı.**', ephemeral: true });
  }

  if (customId === 'btn_mesai_cikis') {
    if (!shiftData.has(user.id)) return interaction.reply({ content: 'Aktif mesainiz yok!', ephemeral: true });
    const durationMs = Date.now() - shiftData.get(user.id);
    const minutes = Math.floor(durationMs / 60000);
    const hours = Math.floor(minutes / 60);
    shiftData.delete(user.id);
    return interaction.reply({ content: `🛑 **Mesaiden çıkıldı.** Süre: **${hours} saat ${minutes % 60} dakika**.`, ephemeral: true });
  }

  if (customId === 'btn_ticket_ac') {
    const channelName = `ticket-${user.username}`;
    if (guild.channels.cache.find(c => c.name === channelName)) {
      return interaction.reply({ content: 'Zaten açık bir biletiniz var.', ephemeral: true });
    }

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
      ]
    });

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('btn_ticket_kapat').setLabel('Ticket Kapat').setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({ content: `Merhaba ${user}, yetkililer yakında sizinle ilgilenecektir.`, components: [closeRow] });
    return interaction.reply({ content: `Talep oluşturuldu: ${ticketChannel}`, ephemeral: true });
  }

  if (customId === 'btn_ticket_kapat') {
    await interaction.reply('Ticket 5 saniye içinde kapatılıyor...');
    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
  }
});

client.login(CONFIG.TOKEN);
