import webpush from 'web-push';

const publicVapidKey = process.env.VAPID_PUBLIC_KEY || 'BLmULyB9cWAjtl0v_keeRkuBKlGdPpj-eKdRKDV0L93lbfuIqZL9ZM0pKoOW5FYfI1UP83KNV2Nvspl2nkqPjyw';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || 'keC_KHCcCl-8SvLIIEfayOV0JSctOsTeKVKUojxuS0k';

const getVapidSubject = () => {
  const envSubject = process.env.VAPID_SUBJECT;
  if (envSubject && (envSubject.startsWith('mailto:') || envSubject.startsWith('http'))) {
    return envSubject;
  }
  return 'mailto:awoyeleemma1@gmail.com';
};

webpush.setVapidDetails(
  getVapidSubject(),
  publicVapidKey,
  privateVapidKey
);

export { webpush, publicVapidKey };
