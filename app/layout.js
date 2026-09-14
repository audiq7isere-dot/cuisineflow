import './globals.css';
import './quote-edit-overrides.css';
export const metadata={title:'CuisineFlow',description:'CRM Cuisine Pour Tous'};
export default function RootLayout({children}){return <html lang="fr"><body>{children}<script src="/quote-enhancer.js" defer></script><script src="/quote-save-redirect.js" defer></script></body></html>}