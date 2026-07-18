export const metadata = {
  title: "Dee April Parfums — B2B Wholesale Portal",
  description: "Browse Chapter I at wholesale prices, place orders, and generate invoices.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`* { margin: 0; padding: 0; box-sizing: border-box; } body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }`}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
