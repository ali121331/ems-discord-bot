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

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('EMS Bot 7/24 Aktif!'));
app.listen(PORT, () => console.log(`Uptime web sunucusu ${PORT} portunda hazır.`));

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
  TOKEN: 'BOT_TOKENINIZ_BURAYA',
  
  // SADECE DOKTORLARIN GÖREBİLECEĞİ VE RANDEVULARIN DÜŞECEĞİ GİZLİ KANAL ID'Sİ
  DOKTOR_RANDEVU_LOG_CHANNEL_ID: '1540130373004951693',

  IMAGE_URL: 'https://cdn.discordapp.com/attachments/1180199538590482514/1540113722423648296/b9fc56e01dcdcce0d228c2271e0b9d0f.png'
};

client.once('ready', () => {
  console.log(`[BOT] ${client.user.tag} aktif ve göreve hazır!`);
});

// --- DOKTORLAR İÇİN KOMUTLAR ---
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const args = message.content.trim().split(/ +/);
  const command = args[0].toLowerCase();

  // KULLANICI ID'Sİ İLE DM'E RANDEVU PANELİ GÖNDERME KOMUTU
  // Kullanım: !randevu-gonder <Kullanıcı_ID>
  if (command === '!randevu-gonder') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply('❌ **Bu komutu kullanmak için yetkiniz bulunmamaktadır.**');
    }

    const targetUserId = args[1];
    if (!targetUserId) {
      return message.reply('❌ **Hatalı kullanım!** Lütfen bir kullanıcı ID\'si belirtiniz.\n**Örnek:** `!randevu-gonder 123456789012345678`');
    }

    try {
      const targetUser = await client.users.fetch(targetUserId);

      const dmEmbed = new EmbedBuilder()
        .setTitle('🏥 PILLBOX HILL MEDICAL CENTER — POLİKLİNİK RANDEVU SİSTEMİ')
        .setColor('#00aaff')
        .setDescription(
          `Sayın Vatandaşımız,\n\n` +
          `Uzman doktorlarımızdan randevu almak için aşağıdaki **"📅 Randevu Oluştur"** butonuna tıklayarak açılan formu doldurabilirsiniz.\n\n` +
          `📌 **Bilgilendirme:**\n` +
          `• Randevu talebiniz tıp merkezimizdeki doktorlarımıza iletilecektir.\n` +
          `• Onay veya red durumu tarafınıza **DM (Özel Mesaj)** yoluyla bildirilecektir.\n\n` +
          `*Hayati tehlike içeren acil durumlar için lütfen 911'i arayınız veya Acil Servis (ER) birimimize başvurunuz.*`
        )
        .setImage(CONFIG.IMAGE_URL)
        .setTimestamp();

      const btnRandevu = new ButtonBuilder()
        .setCustomId('btn_randevu_olustur')
        .setLabel('📅 Randevu Oluştur')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(btnRandevu);

      await targetUser.send({ embeds: [dmEmbed], components: [row] });
      return message.reply(`✅ Randevu alma paneli **${targetUser.tag}** (${targetUser.id}) kullanıcısının DM kutusuna başarıyla gönderildi.`);

    } catch (err) {
      console.error('DM Gönderme Hatası:', err);
      return message.reply('❌ **Panel gönderilemedi!** Kullanıcının DM kutusu kapalı olabilir veya ID hatalı olabilir.');
    }
  }
});

// --- ETKİLEŞİM DİNLEYİCİSİ (BUTON VE MODAL) ---
client.on('interactionCreate', async (interaction) => {

  // 1. DM'DEKİ BUTONA TIKLANDIĞINDA AÇILAN MODAL (FORM)
  if (interaction.isButton()) {
    const { customId, user } = interaction;

    if (customId === 'btn_randevu_olustur') {
      const modal = new ModalBuilder()
        .setCustomId('modal_randevu_formu')
        .setTitle('Poliklinik Randevu Formu');

      const nameInput = new TextInputBuilder()
        .setCustomId('randevu_ad_soyad')
        .setLabel('Adınız Soyadınız ve İletişim / Tel No')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: Ahmet Yılmaz - Tel: 555-0192')
        .setRequired(true);

      const branchInput = new TextInputBuilder()
        .setCustomId('randevu_brans')
        .setLabel('Muayene Olmak İstediğiniz Branş / Doktor')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: Genel Cerrahi - Dr. Smith')
        .setRequired(true);

      const dateInput = new TextInputBuilder()
        .setCustomId('randevu_tarih_saat')
        .setLabel('Talep Edilen Tarih ve Saat')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: 23 Ağustos Saat 20:30')
        .setRequired(true);

      const detailInput = new TextInputBuilder()
        .setCustomId('randevu_sikayet')
        .setLabel('Şikayetiniz / Muayene Sebebiniz')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Kısaca rahatsızlığınızı ve randevu alma nedeninizi açıklayınız.')
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(branchInput),
        new ActionRowBuilder().addComponents(dateInput),
        new ActionRowBuilder().addComponents(detailInput)
      );

      await interaction.showModal(modal);
      return;
    }

    // DOKTOR KANALINDAKİ ONAY/RED BUTONLARI
    if (customId.startsWith('btn_randevu_onay_') || customId.startsWith('btn_randevu_red_')) {
      if (interaction.message && interaction.message.components.length > 0) {
        const firstBtn = interaction.message.components[0].components[0];
        if (firstBtn && firstBtn.disabled) {
          return interaction.reply({ content: '❌ **Bu randevu talebi zaten yanıtlanmış!**', ephemeral: true });
        }
      }

      const actionType = customId.includes('_onay_') ? 'onay' : 'red';
      const parts = customId.split('_');
      const patientId = parts[parts.length - 2];
      const randevuId = parts[parts.length - 1];

      const modal = new ModalBuilder()
        .setCustomId(`modal_randevu_yanit_${actionType}_${patientId}_${randevuId}`)
        .setTitle(actionType === 'onay' ? 'Randevu Onay Notu' : 'Randevu Red Nedeni');

      const noteInput = new TextInputBuilder()
        .setCustomId('randevu_doktor_notu')
        .setLabel(actionType === 'onay' ? 'Muayene Notu / Muayene Odası' : 'Red Gerekçesi')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder(actionType === 'onay' ? 'Örn: Randevunuz onaylandı. Belirtilen saatte Poliklinik 2 odasına geliniz.' : 'Örn: İlgili saatte acil ameliyatım olduğundan randevu oluşturulamadı.')
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(noteInput));
      await interaction.showModal(modal);
      return;
    }
  }

  // 2. FORM GÖNDERİLDİĞİNDE VEYA DOKTOR YANITLADIĞINDA
  if (interaction.isModalSubmit()) {
    const { customId, user } = interaction;

    // SİVİL FORMU GÖNDERDİĞİNDE
    if (customId === 'modal_randevu_formu') {
      const adSoyad = interaction.fields.getTextInputValue('randevu_ad_soyad');
      const brans = interaction.fields.getTextInputValue('randevu_brans');
      const tarihSaat = interaction.fields.getTextInputValue('randevu_tarih_saat');
      const sikayet = interaction.fields.getTextInputValue('randevu_sikayet');
      const randevuId = interaction.id;

      const randevuEmbed = new EmbedBuilder()
        .setTitle('🩺 PILLBOX HILL MC — YENİ RANDEVU TALEBİ')
        .setColor('#00aaff')
        .addFields(
          { name: 'Hasta Discord', value: `${user} (${user.tag})`, inline: true },
          { name: 'Ad Soyad / İletişim', value: adSoyad, inline: true },
          { name: 'Branş / Doktor', value: brans, inline: true },
          { name: 'Talep Edilen Tarih/Saat', value: tarihSaat, inline: true },
          { name: 'Şikayet / Muayene Nedeni', value: sikayet, inline: false }
        )
        .setFooter({ text: `Randevu ID: ${randevuId}` })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`btn_randevu_onay_${user.id}_${randevuId}`)
          .setLabel('Onayla')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`btn_randevu_red_${user.id}_${randevuId}`)
          .setLabel('Reddet')
          .setStyle(ButtonStyle.Danger)
      );

      // TALEP SADECE DOKTOR KANALINA DÜŞER
      const doktorLogChannel = client.channels.cache.get(CONFIG.DOKTOR_RANDEVU_LOG_CHANNEL_ID);
      if (doktorLogChannel) {
        await doktorLogChannel.send({
          content: `📌 **Yeni Poliklinik Randevu Talebi:** (${brans}) — ${user}`,
          embeds: [randevuEmbed],
          components: [row]
        });
      }

      return interaction.reply({
        content: '✅ **Randevu talebiniz doktorlarımıza iletildi.** Yanıt durumunuz DM üzerinden bildirilecektir.',
        ephemeral: true
      });
    }

    // DOKTOR KARAR VERDİĞİNDE
    if (customId.startsWith('modal_randevu_yanit_')) {
      const parts = customId.split('_');
      const actionType = parts[parts.length - 3];
      const patientId = parts[parts.length - 2];
      const doktorNotu = interaction.fields.getTextInputValue('randevu_doktor_notu');

      const isApproved = actionType === 'onay';
      const color = isApproved ? '#00ff00' : '#ff0000';
      const statusTitle = isApproved ? '✅ RANDEVU ONAYLANDI' : '❌ RANDEVU REDDEDİLDİ';

      try {
        const patientUser = await client.users.fetch(patientId);

        // HASTAYA DM BİLDİRİMİ
        const patientDmEmbed = new EmbedBuilder()
          .setTitle(isApproved ? '📅 Randevunuz Onaylandı!' : '❌ Randevu Talebiniz Reddedildi')
          .setColor(color)
          .addFields(
            { name: 'İlgili Doktor', value: `${user.tag}`, inline: true },
            { name: 'Durum', value: isApproved ? '✅ Onaylandı' : '❌ Reddedildi', inline: true },
            { name: isApproved ? 'Doktor Notu / Muayene Bilgisi' : 'Red Nedeni', value: doktorNotu, inline: false }
          )
          .setTimestamp();

        await patientUser.send({ embeds: [patientDmEmbed] }).catch(() => {});

        // DOKTOR KANALINDAKİ MESAJI DÜZENLE
        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('disabled_randevu_status')
            .setLabel(`${statusTitle} (${user.username})`)
            .setStyle(isApproved ? ButtonStyle.Success : ButtonStyle.Danger)
            .setDisabled(true)
        );

        if (interaction.message) {
          const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor(color)
            .addFields(
              { name: '⚡ İşlem Yapan Doktor', value: `${user} (${user.tag})`, inline: true },
              { name: isApproved ? 'Doktor Notu' : 'Red Gerekçesi', value: doktorNotu, inline: false }
            );

          await interaction.message.edit({ embeds: [updatedEmbed], components: [disabledRow] });
        }

        return interaction.reply({
          content: `✅ Randevu talebi **${isApproved ? 'ONAYLANDI' : 'REDDEDİLDİ'}**. Patient: ${patientUser.tag}`,
          ephemeral: true
        });

      } catch (err) {
        console.error('Hata:', err);
        return interaction.reply({ content: '❌ İşlem sırasında bir hata oluştu.', ephemeral: true });
      }
    }
  }
});

client.login(CONFIG.TOKEN);
