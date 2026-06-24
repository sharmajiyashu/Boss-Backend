import FAQ from '../models/FAQ';
import AppLogger from '../api/loaders/logger';

export async function seedFAQs() {
  try {
    const count = await FAQ.countDocuments();
    if (count === 0) {
      const defaultFAQs = [
        {
          question: "How do I list a product?",
          answer: "To list a product, click the 'Add Listing' button, choose a category and subcategory, fill in the required fields and custom details, and upload photos.",
          isPublish: true,
          sortOrder: 1,
        },
        {
          question: "Are the listings verified?",
          answer: "All listings go through our admin moderation check before being approved and shown publicly to ensure safety and authenticity.",
          isPublish: true,
          sortOrder: 2,
        },
        {
          question: "How can I contact a seller?",
          answer: "You can chat with the seller directly using the built-in chat option on the product detail page.",
          isPublish: true,
          sortOrder: 3,
        },
        {
          question: "Is there any platform fee?",
          answer: "Platform fees are configured by the admin and shown to you before publishing/updating a paid listing.",
          isPublish: true,
          sortOrder: 4,
        },
        {
          question: "Can I change my listing details later?",
          answer: "Yes, you can edit your listings from your profile section. Edited listings will re-enter moderation for approval.",
          isPublish: true,
          sortOrder: 5,
        }
      ];

      await FAQ.create(defaultFAQs);
      AppLogger.info('🌱 Seeded default FAQs.');
    }
  } catch (error) {
    AppLogger.error('❌ Error seeding FAQs:', error);
  }
}
