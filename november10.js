// 10 Kasım anma açıklaması: Türkiye saatine göre otomatik uygula / geri al.
const fs = require('node:fs');
const path = require('node:path');

function setupNovember10Description(client, commemorativeDescription, fallbackDescription) {
  const backupFile = path.join(process.cwd(), '.bot-description-backup.json');
  const marker = '1881 – ∞';
  let working = false;
  const todayInTurkey = () => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Istanbul', month: '2-digit', day: '2-digit',
    }).format(new Date());
    return parts;
  };
  const getBackup = () => {
    try {
      const content = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
      return typeof content.description === 'string' ? content.description : null;
    } catch { return null; }
  };
  const saveBackup = (description) => {
    try {
      fs.writeFileSync(backupFile, JSON.stringify({ description }), { mode: 0o600 });
    } catch (error) {
      console.warn('[10 KASIM] Orijinal açıklama dosyaya kaydedilemedi:', error.message);
    }
  };
  async function syncDescription() {
    if (working) return;
    working = true;
    try {
      const application = await client.application.fetch();
      const current = application.description || '';
      if (todayInTurkey() === '10/11') {
        if (current !== commemorativeDescription) {
          if (!current.startsWith(marker) && current !== commemorativeDescription) {
            saveBackup(current);
          }
          await client.application.edit({ description: commemorativeDescription });
          console.log('[10 KASIM] Anma açıklaması aktif.');
        }
      } else if (current === commemorativeDescription) {
        const restored = process.env.BOT_NORMAL_DESCRIPTION ?? getBackup() ?? fallbackDescription;
        await client.application.edit({ description: restored });
        console.log('[10 KASIM] Normal bot açıklaması geri yüklendi.');
      }
    } catch (error) {
      console.error('[10 KASIM] Açıklama güncellenemedi:', error);
    } finally {
      working = false;
    }
  }
  void syncDescription();
  setInterval(() => void syncDescription(), 60_000);
}

module.exports = { setupNovember10Description };
