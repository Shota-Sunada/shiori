const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#50141c] text-white p-4 flex justify-between items-center text-sm">
      <div>
        <p>
          &copy; {year}
          {' Shota-Sunada, All rights reserved.'}
        </p>
      </div>
      <div>
        <p className="text-sm">
          {'v'}
          {import.meta.env.APP_VERSION}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
