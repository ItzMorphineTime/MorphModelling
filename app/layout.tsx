import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Morph Modeling',description:'Morph Modeling — browser-based 3D modeling, materials, and UV editing.',icons:{icon:'/favicon.svg',shortcut:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
