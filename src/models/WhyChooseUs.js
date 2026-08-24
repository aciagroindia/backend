const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true }
}, { _id: false });

const whyChooseUsSchema = new mongoose.Schema({
    tag: {
        type: String,
        default: 'ROOTED IN TRADITION'
    },
    mainHeading: {
        type: String,
        default: 'WHY CHOOSE US'
    },
    heading: {
        type: String,
        default: 'Crafted by Nature.'
    },
    subheading: {
        type: String,
        default: 'Powered by ACI.'
    },
    description: {
        type: String,
        default: 'ACI me hum ancient Ayurvedic wisdom ko modern science ke saath combine karke aise products banate hain jo aapke body ko naturally nourish kare. Har ingredient carefully source kiya jata hai, ethically process hota hai, aur proper testing ke baad hi use hota hai — taaki aapko mile pure, natural aur trusted wellness.'
    },
    points: {
        type: [pointSchema],
        default: [
            {
                title: '✔ 100% Natural',
                description: 'No artificial additives or preservatives.'
            },
            {
                title: '✔ Ethically Sourced',
                description: 'Direct partnerships with trusted farmers.'
            },
            {
                title: '✔ Lab Tested',
                description: 'Strict quality control for every batch.'
            }
        ]
    },
    imageUrl: {
        type: String,
        default: '/certifiedIcons/whychooseus.png'
    },
    publicId: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('WhyChooseUs', whyChooseUsSchema);
