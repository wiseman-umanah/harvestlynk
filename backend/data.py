CLASS_NAMES = [
    # APPLE
    "Apple___Apple_scab",
    "Apple___Black_rot",
    "Apple___Cedar_apple_rust",
    "Apple___Powdery_mildew",
    "Apple___Fire_blight",
    "Apple___Alternaria_leaf_spot",
    "Apple___healthy",

    # BLUEBERRY
    "Blueberry___Anthracnose",
    "Blueberry___Leaf_rust",
    "Blueberry___Mummy_berry",
    "Blueberry___Powdery_mildew",
    "Blueberry___healthy",

    # CHERRY
    "Cherry___Powdery_mildew",
    "Cherry___Leaf_spot",
    "Cherry___Brown_rot",
    "Cherry___Bacterial_canker",
    "Cherry___healthy",

    # CORN
    "Corn___Cercospora_leaf_spot",
    "Corn___Common_rust",
    "Corn___Northern_Leaf_Blight",
    "Corn___Southern_Leaf_Blight",
    "Corn___Gray_leaf_spot",
    "Corn___Stewart_wilt",
    "Corn___healthy",

    # GRAPE
    "Grape___Black_rot",
    "Grape___Esca",
    "Grape___Leaf_blight",
    "Grape___Downy_mildew",
    "Grape___Powdery_mildew",
    "Grape___Anthracnose",
    "Grape___healthy",

    # ORANGE
    "Orange___Haunglongbing",
    "Orange___Citrus_canker",
    "Orange___Greasy_spot",
    "Orange___Melanose",
    "Orange___Black_spot",
    "Orange___healthy",

    # PEACH
    "Peach___Bacterial_spot",
    "Peach___Leaf_curl",
    "Peach___Brown_rot",
    "Peach___Scab",
    "Peach___healthy",

    # PEPPER
    "Pepper_bell___Bacterial_spot",
    "Pepper_bell___Anthracnose",
    "Pepper_bell___Phytophthora_blight",
    "Pepper_bell___Leaf_spot",
    "Pepper_bell___healthy",

    # POTATO
    "Potato___Early_blight",
    "Potato___Late_blight",
    "Potato___Black_scurf",
    "Potato___Common_scab",
    "Potato___Verticillium_wilt",
    "Potato___healthy",

    # RASPBERRY
    "Raspberry___Leaf_spot",
    "Raspberry___Anthracnose",
    "Raspberry___Rust",
    "Raspberry___healthy",

    # SOYBEAN
    "Soybean___Rust",
    "Soybean___Bacterial_blight",
    "Soybean___Frogeye_leaf_spot",
    "Soybean___Downy_mildew",
    "Soybean___healthy",

    # SQUASH
    "Squash___Powdery_mildew",
    "Squash___Downy_mildew",
    "Squash___Anthracnose",
    "Squash___Angular_leaf_spot",
    "Squash___healthy",

    # STRAWBERRY
    "Strawberry___Leaf_scorch",
    "Strawberry___Gray_mold",
    "Strawberry___Powdery_mildew",
    "Strawberry___Anthracnose",
    "Strawberry___healthy",

    # TOMATO
    "Tomato___Bacterial_spot",
    "Tomato___Early_blight",
    "Tomato___Late_blight",
    "Tomato___Leaf_Mold",
    "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites",
    "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato___Tomato_mosaic_virus",
    "Tomato___Fusarium_wilt",
    "Tomato___Verticillium_wilt",
    "Tomato___Anthracnose",
    "Tomato___Bacterial_wilt",
    "Tomato___Damping_off",
    "Tomato___healthy",

    # RICE
    "Rice___Blast",
    "Rice___Brown_spot",
    "Rice___Bacterial_leaf_blight",
    "Rice___Sheath_blight",
    "Rice___False_smut",
    "Rice___healthy",

    # WHEAT
    "Wheat___Leaf_rust",
    "Wheat___Stem_rust",
    "Wheat___Stripe_rust",
    "Wheat___Powdery_mildew",
    "Wheat___Septoria",
    "Wheat___healthy",

    # CASSAVA
    "Cassava___Bacterial_blight",
    "Cassava___Brown_streak_disease",
    "Cassava___Mosaic_disease",
    "Cassava___Anthracnose",
    "Cassava___healthy",

    # BANANA
    "Banana___Black_sigatoka",
    "Banana___Panama_disease",
    "Banana___Bacterial_wilt",
    "Banana___Moko_disease",
    "Banana___healthy",

    # MANGO
    "Mango___Anthracnose",
    "Mango___Powdery_mildew",
    "Mango___Bacterial_canker",
    "Mango___Sooty_mold",
    "Mango___healthy"
]



TREATMENTS = {
    # APPLE
    "Apple_scab": {
        "symptoms": "Olive-green or brown spots on leaves and fruits.",
        "cause": "Fungal infection caused by Venturia inaequalis.",
        "treatment": "Apply fungicides such as myclobutanil or captan every 7–10 days during wet seasons.",
        "prevention": "Remove fallen leaves, improve air circulation, and plant resistant varieties."
    },

    "Apple_Black_rot": {
        "symptoms": "Dark circular lesions on leaves and rotting fruits.",
        "cause": "Fungus Botryosphaeria obtusa.",
        "treatment": "Prune infected branches and spray sulfur-based fungicides.",
        "prevention": "Sanitize orchard debris and avoid tree wounds."
    },

    "Apple_Fire_blight": {
        "symptoms": "Branches appear scorched and wilted.",
        "cause": "Bacterial infection caused by Erwinia amylovora.",
        "treatment": "Prune infected shoots 8–12 inches below visible symptoms.",
        "prevention": "Disinfect tools and avoid excessive nitrogen fertilizer."
    },

    # POTATO
    "Potato_Early_blight": {
        "symptoms": "Brown concentric spots on lower leaves.",
        "cause": "Alternaria solani fungus.",
        "treatment": "Use chlorothalonil fungicides and rotate crops.",
        "prevention": "Avoid overhead watering and remove infected foliage."
    },

    "Potato_Late_blight": {
        "symptoms": "Water-soaked lesions and white mold under leaves.",
        "cause": "Phytophthora infestans.",
        "treatment": "Destroy infected plants immediately and apply metalaxyl.",
        "prevention": "Plant resistant varieties and improve drainage."
    },

    "Potato_Common_scab": {
        "symptoms": "Rough corky lesions on tubers.",
        "cause": "Streptomyces bacteria.",
        "treatment": "Maintain slightly acidic soil conditions.",
        "prevention": "Use certified disease-free seed potatoes."
    },

    # TOMATO
    "Tomato_Early_blight": {
        "symptoms": "Dark spots with concentric rings on older leaves.",
        "cause": "Alternaria solani fungus.",
        "treatment": "Apply copper fungicides and mulch plants.",
        "prevention": "Rotate crops and avoid wet foliage."
    },

    "Tomato_Late_blight": {
        "symptoms": "Rapid leaf collapse with dark lesions.",
        "cause": "Phytophthora infestans.",
        "treatment": "Apply chlorothalonil and remove infected plants.",
        "prevention": "Ensure proper spacing and avoid excessive humidity."
    },

    "Tomato_Leaf_Mold": {
        "symptoms": "Yellow patches on leaf tops with mold underneath.",
        "cause": "Passalora fulva fungus.",
        "treatment": "Improve air circulation and reduce greenhouse humidity.",
        "prevention": "Avoid overcrowding and prune lower leaves."
    },

    "Tomato_Septoria_leaf_spot": {
        "symptoms": "Tiny circular spots with gray centers.",
        "cause": "Septoria lycopersici fungus.",
        "treatment": "Remove infected leaves and apply copper fungicides.",
        "prevention": "Water at the base of plants and rotate crops yearly."
    },

    "Tomato_Spider_mites": {
        "symptoms": "Tiny yellow speckles and webbing on leaves.",
        "cause": "Spider mite infestation.",
        "treatment": "Spray neem oil or insecticidal soap.",
        "prevention": "Maintain humidity and inspect leaves regularly."
    },

    "Tomato_Yellow_Leaf_Curl": {
        "symptoms": "Yellow curled leaves and stunted growth.",
        "cause": "Tomato Yellow Leaf Curl Virus spread by whiteflies.",
        "treatment": "Remove infected plants and control whiteflies.",
        "prevention": "Use reflective mulch and resistant tomato varieties."
    },

    "Tomato_mosaic_virus": {
        "symptoms": "Mottled green/yellow mosaic leaf patterns.",
        "cause": "Tomato mosaic virus.",
        "treatment": "Remove infected plants immediately.",
        "prevention": "Sterilize tools and avoid tobacco contamination."
    },

    "Tomato_Fusarium_wilt": {
        "symptoms": "Yellowing and wilting starting from lower leaves.",
        "cause": "Fusarium oxysporum fungus.",
        "treatment": "Use resistant cultivars and soil fungicides.",
        "prevention": "Rotate crops and sterilize soil."
    },

    # CORN
    "Corn_Common_rust": {
        "symptoms": "Reddish-brown pustules on leaves.",
        "cause": "Puccinia sorghi fungus.",
        "treatment": "Apply foliar fungicides.",
        "prevention": "Plant resistant hybrids and monitor humidity."
    },

    "Corn_Northern_Leaf_Blight": {
        "symptoms": "Long cigar-shaped gray lesions.",
        "cause": "Exserohilum turcicum fungus.",
        "treatment": "Use fungicides containing azoxystrobin.",
        "prevention": "Rotate crops and remove crop residue."
    },

    # GRAPE
    "Grape_Black_rot": {
        "symptoms": "Brown leaf spots and shriveled black fruits.",
        "cause": "Guignardia bidwellii fungus.",
        "treatment": "Apply fungicides such as mancozeb.",
        "prevention": "Prune vines and improve airflow."
    },

    "Grape_Downy_mildew": {
        "symptoms": "Yellow oily spots with white growth underneath.",
        "cause": "Plasmopara viticola.",
        "treatment": "Apply copper-based fungicides.",
        "prevention": "Avoid excessive irrigation and improve ventilation."
    },

    # RICE
    "Rice_Blast": {
        "symptoms": "Diamond-shaped lesions on leaves.",
        "cause": "Magnaporthe oryzae fungus.",
        "treatment": "Apply systemic fungicides.",
        "prevention": "Use resistant rice varieties and balanced fertilization."
    },

    "Rice_Bacterial_leaf_blight": {
        "symptoms": "Yellowing and drying leaf edges.",
        "cause": "Xanthomonas oryzae bacteria.",
        "treatment": "Use copper bactericides.",
        "prevention": "Avoid excessive nitrogen fertilizer."
    },

    # BANANA
    "Banana_Black_sigatoka": {
        "symptoms": "Dark streaks and yellowing leaves.",
        "cause": "Mycosphaerella fijiensis fungus.",
        "treatment": "Apply fungicides and remove infected leaves.",
        "prevention": "Ensure proper field sanitation."
    },

    "Banana_Panama_disease": {
        "symptoms": "Yellowing and wilting leaves.",
        "cause": "Fusarium oxysporum f.sp cubense.",
        "treatment": "Destroy infected plants and disinfect soil.",
        "prevention": "Use resistant banana cultivars."
    },

    # CASSAVA
    "Cassava_Mosaic_disease": {
        "symptoms": "Mosaic leaf discoloration and stunted growth.",
        "cause": "Cassava mosaic virus.",
        "treatment": "Remove infected plants.",
        "prevention": "Use virus-free cuttings and control whiteflies."
    },

    # GENERAL
    "Bacterial_spot": {
        "symptoms": "Dark water-soaked lesions on leaves and fruits.",
        "cause": "Bacterial pathogens.",
        "treatment": "Apply copper bactericides and remove infected areas.",
        "prevention": "Avoid overhead irrigation and sanitize tools."
    },

    "Powdery_mildew": {
        "symptoms": "White powdery growth on leaves.",
        "cause": "Fungal pathogens.",
        "treatment": "Apply sulfur or potassium bicarbonate sprays.",
        "prevention": "Increase sunlight exposure and airflow."
    },

    "healthy": {
        "symptoms": "No visible disease symptoms.",
        "cause": "Healthy plant condition.",
        "treatment": "Continue regular watering, fertilization, and monitoring.",
        "prevention": "Maintain good agricultural practices and inspect regularly."
    }
}
