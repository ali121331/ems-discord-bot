 Doktor Müsaitlik Bildirimi')
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

          const leaveData = {
            type: isNormal ? 'Personel Mazereti' : 'Akademi Mazereti',
            reason,
            approvedBy: user.id,
            approvedAt: new Date().toISOString(),
            mazeretId
          };

          leaveRecords.set(studentId, leaveData);
          await saveUserData(studentId);
          await logAdminAction(
            targetGuild,
            user,
            'Mazeret / İzin Onayı',
            `<@${studentId}> için ${leaveData.type} onaylandı. Gerekçe: ${reason}`
          );
        } else {
          await logAdminAction(
            targetGuild,
            user,
            'Mazeret Reddi',
            `<@${studentId}> mazereti reddedildi. Gerekçe: ${reason}`
          );
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
if (!CONFIG.TOKEN) {
  console.error('[BOT] KRİTİK: TOKEN environment variable bulunamadı. Render > Environment > TOKEN kontrol edilmeli.');
} else {
  console.log('[BOT] TOKEN bulundu. Discord login başlatılıyor...');
  
}

// ============================================================
// DISCORD BAĞLANTISI
// ============================================================
client.on('shardReady', (shardId) => {
  console.log(`[GATEWAY] Shard ${shardId} HAZIR.`);
});

client.on('shardDisconnect', (event, shardId) => {
  console.error(`[GATEWAY DISCONNECT] Shard: ${shardId} | Kod: ${event.code} | Sebep: ${event.reason || 'Yok'}`);
});

client.on('shardReconnecting', (shardId) => {
  console.log(`[GATEWAY] Shard ${shardId} yeniden bağlanıyor...`);
});

client.once('clientReady', async () => {
  console.log(`[BOT] ${client.user.tag} aktif!`);
  console.log(`[BOT] Discord bağlantısı başarılı. Guild sayısı: ${client.guilds.cache.size}`);
  console.log(`[BOT] Kullanıcı ID: ${client.user.id}`);
  await loadPersistentData();

  // Kalıcı kayıtta izinli görünen kişilerin rolünü açılışta doğrula.
  const guild = client.guilds.cache.get(CONFIG.GUILD_ID) || client.guilds.cache.first();
  if (guild) {
    const izinRole = guild.roles.cache.get(CONFIG.IZINLI_PERSONEL_ROLE_ID);
    if (izinRole) {
      for (const userId of leaveRecords.keys()) {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member && !member.roles.cache.has(izinRole.id)) {
          await member.roles.add(izinRole).catch(() => {});
        }
      }
    }
  }
});

if (!CONFIG.TOKEN) {
  console.error('[BOT] KRİTİK: TOKEN environment variable bulunamadı.');
  process.exitCode = 1;
} else {
  console.log('[BOT] TOKEN bulundu. Discord bağlantısı başlatılıyor...');
  client.login(CONFIG.TOKEN).catch((error) => {
    console.error('[BOT] Discord giriş hatası:', error);
  });
}
