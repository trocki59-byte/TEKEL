import { getChatGPTUser, chatGPTSignInPath } from './chatgpt-auth';
import BayiApp from './BayiApp';
export const dynamic = 'force-dynamic';
export default async function Page() { const user = await getChatGPTUser(); if (!user)
    return <main className="login"><div className="studio-mark">T<span>•</span></div><p className="eyebrow">TROÇKİ STUDIO</p><h1>İşinizin kontrolü,<br />tek bir yerde.</h1><p>Satış, stok ve hesaplarınız. Telefonunuzda ve bilgisayarınızda.</p><a className="btn primary" href={chatGPTSignInPath('/')} target="_top">Güvenli giriş yap →</a><small>Özel bayi yönetim alanı</small></main>; return <BayiApp />; }
