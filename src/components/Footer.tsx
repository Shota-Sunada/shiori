const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#50141c] text-white p-4 flex justify-between items-center">
      <div>
        <p>
          &copy; {year}
          {' Shudo 79th. All rights reserved.'}
        </p>
      </div>
      <div>
        <p className="text-xs">
          {'v'}
          {import.meta.env.APP_VERSION}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
