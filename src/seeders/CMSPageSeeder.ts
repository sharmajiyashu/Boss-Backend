import CMSPage from '../models/CMSPage';
import AppLogger from '../api/loaders/logger';

export async function seedCMSPages() {
  try {
    const defaultPages = [
      {
        title: 'About Us',
        slug: 'about-us',
        content: `
          <h2>About BOSS Platform</h2>
          <p>Welcome to BOSS Platform, the premier destination for connecting buyers and sellers securely and efficiently.</p>
          <p>Our mission is to empower communities by providing a robust, high-performance marketplace platform where you can list products, explore categories, and chat directly with verified users.</p>
          <blockquote>Safe, fast, and transparent classifieds for everyone.</blockquote>
        `
      },
      {
        title: 'Terms & Conditions',
        slug: 'terms-and-conditions',
        content: `
          <h2>Terms of Service</h2>
          <p>Please read these Terms and Conditions carefully before using the BOSS mobile application and web dashboard.</p>
          <h3>1. Acceptance of Terms</h3>
          <p>By registering an account and using our platform, you agree to comply with and be bound by these guidelines and regulations.</p>
          <h3>2. Listing Authenticity</h3>
          <p>All sellers are required to list items with accurate pricing, details, and authentic images. Fake listings are subject to moderation and blocking.</p>
        `
      },
      {
        title: 'Privacy Policy',
        slug: 'privacy-policy',
        content: `
          <h2>Privacy Policy</h2>
          <p>We value your privacy. This policy explains how we collect, store, and process your data when using the BOSS Platform.</p>
          <h3>Information We Collect</h3>
          <ul>
            <li>Profile details (First Name, Last Name, Email, Phone number)</li>
            <li>Listing information and product media</li>
            <li>Location data for matching items in your vicinity</li>
          </ul>
        `
      },
      {
        title: 'Contact Us',
        slug: 'contact-us',
        content: `
          <h2>Get In Touch</h2>
          <p>If you have any questions, support requests, or moderation inquiries, please feel free to reach out to our dedicated support desk.</p>
          <p><strong>Support Email:</strong> support@bossplatform.com</p>
          <p><strong>Business Hours:</strong> Monday – Friday, 9:00 AM – 6:00 PM</p>
        `
      }
    ];

    for (const pageData of defaultPages) {
      const exists = await CMSPage.findOne({ slug: pageData.slug });
      if (!exists) {
        await CMSPage.create(pageData);
        AppLogger.info(`🌱 Seeded default CMS page: ${pageData.title}`);
      }
    }
  } catch (error) {
    AppLogger.error('❌ Error seeding CMS pages:', error);
  }
}
