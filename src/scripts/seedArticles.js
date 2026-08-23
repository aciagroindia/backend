const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config();

const Article = require('../models/Article');

const initialArticles = [
  {
    title: "How to Use Ashwagandha Powder with Water: A Complete Guide to Daily Ayurvedic Wellness",
    slug: "how-to-use-ashwagandha-powder-with-water",
    breadcrumbTitle: "How to Use Ashwagandha Powder with Water: A Complete Guide to Daily Ayurvedic Wellness",
    category: "Ayurvedic Herbs",
    author: "ACI Ayurveda Expert",
    description: "Quick Answer: Ashwagandha powder can be easily consumed by mixing half to one teaspoon in 200 to 300 milliliters of lukewarm water...",
    image: "/certifiedIcons/product.jpeg",
    status: "Published",
    content: `
      <p>
        <strong>Quick Answer:</strong> Ashwagandha powder can be easily consumed by mixing half to one teaspoon in 200 to 300 milliliters of lukewarm water. Drinking it on an empty stomach in the morning allows for optimal absorption, supports stress reduction, boosts immunity, enhances energy, and promotes hormonal balance. This method is simple, natural, and suitable for daily use.
      </p>

      <p>
        If you are looking for a natural way to manage stress, improve energy levels, and support overall wellness, knowing how to use ashwagandha powder with water is an excellent starting point. Ashwagandha, one of the most revered herbs in Ayurveda, has been used for centuries to promote vitality, mental clarity, and hormonal balance. In this comprehensive guide, we will explain step-by-step how to consume ashwagandha powder with water, the optimal timing, alternative consumption methods, dosage recommendations, and frequently asked questions to help you maximize its benefits in a safe and effective way.
      </p>

      <h2>WHAT IS ASHWAGANDHA POWDER?</h2>

      <h3>THE AYURVEDIC SUPER-HERB YOU NEED</h3>
      <p>
        Ashwagandha, scientifically known as <em>Withania somnifera</em>, is often referred to as Indian ginseng because of its rejuvenating and adaptogenic qualities. It has long been used in Ayurveda to enhance stamina, strengthen immunity, and help the body manage stress more effectively. The dried root is finely ground into an <a>ayurvedic herbal powder</a> that can be easily mixed with water for everyday use.
      </p>

      <h3>TRADITIONAL USES VERSUS MODERN APPLICATIONS</h3>
      <p>
        In traditional Ayurvedic practices, ashwagandha was often used in the form of decoctions, tonics, and herbal pastes. Modern usage has made it more convenient with the availability of capsules, tablets, and powdered forms. Among these, the powder remains the most versatile and adaptable for daily use. Drinking it with water is considered one of the simplest ways to gain its full benefits because it is easily absorbed by the body and does not require heavy digestion.
      </p>

      <h3>WHY POWDER FORM IS EFFECTIVE</h3>
      <p>
        Powdered ashwagandha is highly effective for daily consumption because it allows for accurate dosing and flexibility. You can start with a small amount and gradually increase based on your body's tolerance. Drinking ashwagandha powder with water helps the nutrients absorb quickly, provides a lighter option for those who cannot consume milk, and is suitable for morning routines aimed at stress reduction and energy enhancement.
      </p>
    `,
    faqs: [
      {
        question: "Can I take Ashwagandha with water instead of milk?",
        answer: "Yes, taking Ashwagandha with lukewarm water is highly effective and a great alternative for those who are lactose intolerant or prefer a lighter option."
      },
      {
        question: "What is the best time to drink Ashwagandha water?",
        answer: "For stress relief and better sleep, consume it 30-45 minutes before bedtime. For daily energy, taking it in the morning on an empty stomach is ideal."
      },
      {
        question: "Can I drink it every day?",
        answer: "Yes, Ashwagandha is generally safe for daily consumption. However, it is recommended to start with a smaller dose and consult an Ayurvedic practitioner if you have specific health conditions."
      }
    ]
  },
  {
    title: "5 Simple Ayurvedic Habits for Healthy Digestion and Gut Wellness",
    slug: "5-ayurvedic-habits-for-healthy-digestion",
    breadcrumbTitle: "5 Simple Ayurvedic Habits for Healthy Digestion",
    category: "Digestion & Gut",
    author: "Dr. ACI Health Team",
    description: "Discover time-tested Ayurvedic rituals to fire up your digestive fire (Agni), eliminate bloating, and restore gut harmony naturally.",
    image: "/certifiedIcons/latestArticle2.png",
    status: "Published",
    content: `
      <p>
        In Ayurveda, good health begins with strong digestion, known as <strong>Agni</strong> (digestive fire). When Agni is balanced, the body efficiently absorbs nutrients and eliminates toxins (Ama). When it is weak, it can lead to indigestion, lethargy, and bloating.
      </p>

      <h2>1. DRINK WARM WATER FIRST THING IN THE MORNING</h2>
      <p>
        Starting your morning with a glass of warm water or ginger-infused water cleanses the gastrointestinal tract and activates metabolism gently.
      </p>

      <h2>2. EAT YOUR LARGEST MEAL AT LUNCHTIME</h2>
      <p>
        According to Ayurvedic circadian rhythms, your digestive fire peaks when the sun is at its highest, between 12:00 PM and 2:00 PM. Make lunch your most substantial meal of the day.
      </p>

      <h2>3. PRACTICE MINDFUL EATING WITHOUT SCREENS</h2>
      <p>
        Eating while distracted slows down enzyme secretion. Sit in a calm environment, chew thoroughly, and allow your senses to engage with the food.
      </p>
    `,
    faqs: [
      {
        question: "How long after eating should I drink water?",
        answer: "It is best to wait 30-45 minutes after meals before drinking large amounts of water to avoid diluting digestive juices."
      }
    ]
  },
  {
    title: "Why Pure Organic Turmeric is the Ultimate Natural Immunity Booster",
    slug: "pure-organic-turmeric-natural-immunity-booster",
    breadcrumbTitle: "Why Pure Organic Turmeric is the Ultimate Natural Immunity Booster",
    category: "Immunity",
    author: "ACI Ayurveda Research",
    description: "Uncover the science and ancient secrets behind Curcumin-rich turmeric root and how it strengthens immune defense across all seasons.",
    image: "/certifiedIcons/latestArticle3.png",
    status: "Published",
    content: `
      <p>
        Turmeric (<em>Curcuma longa</em>) is celebrated as the "Golden Herb" of Ayurveda. Loaded with bioactive curcuminoids, turmeric possesses remarkable antioxidant, anti-inflammatory, and antimicrobial properties.
      </p>

      <h2>THE POWER OF CURCUMIN IN CELLULAR DEFENSE</h2>
      <p>
        Curcumin neutralizes free radicals while stimulating the body's own antioxidant enzymes, providing a double-action shield against seasonal infections.
      </p>

      <h2>HOW TO MAXIMIZE TURMERIC ABSORPTION</h2>
      <p>
        Curcumin is fat-soluble and best absorbed when combined with healthy fats (such as pure A2 Ghee) and a pinch of black pepper (Piperine), which increases absorption by up to 2000%.
      </p>
    `,
    faqs: [
      {
        question: "Can I take raw turmeric daily?",
        answer: "Yes, 1-3 grams of pure organic turmeric daily in warm water or golden milk supports immune vitality safely."
      }
    ]
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    for (const item of initialArticles) {
      const exists = await Article.findOne({ slug: item.slug });
      if (!exists) {
        await Article.create(item);
        console.log(`Created article: ${item.title}`);
      } else {
        console.log(`Article already exists: ${item.slug}`);
      }
    }
    console.log("Seeding complete!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seed();
