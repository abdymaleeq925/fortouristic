import { GoogleGenerativeAI } from "@google/generative-ai";
import { ID } from "appwrite";
import { createProduct } from "lib/stripe";
import { parseMarkdownToJson, parseTripData } from "lib/utils";
import { data, type ActionFunctionArgs } from "react-router";
import { appwriteConfig, database } from "~/appwrite/client";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { country, cities, numberOfDays, travelStyle, interests, budget, groupType, userId } = await request.json();
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const unsplashApiKey = process.env.UNSPLASH_ACCESS_KEY;

    try {
        console.log("Generating trip for:", { country, cities, numberOfDays });
        const prompt = `Generate a ${numberOfDays}-day travel itinerary for ${country} based on the following user information:
            Budget: '${budget}'
            ${cities.length > 0 && `Cities: ${cities}`}
            Interests: '${interests}'
            TravelStyle: '${travelStyle}'
            GroupType: '${groupType}'
            Return the itinerary and lowest estimated price in a clean, non-markdown JSON format with the following structure:
            {
            "name": "A descriptive title for the trip",
            "description": "A brief description of the trip and its highlights not exceeding 100 words",
            "estimatedPrice": "Lowest average price for the trip in USD, e.g.$price",
            "duration": ${numberOfDays},
            "budget": "${budget}",
            "travelStyle": "${travelStyle}",
            "country": "${country}",
            "interests": "${interests}",
            "groupType": "${groupType}",
            "bestTimeToVisit": [
            '🌸 Season (from month to month): reason to visit',
            '☀️ Season (from month to month): reason to visit',
            '🍁 Season (from month to month): reason to visit',
            '❄️ Season (from month to month): reason to visit'
            ],
            "weatherInfo": [
            '☀️ Season: temperature range in Celsius (temperature range in Fahrenheit)',
            '🌦️ Season: temperature range in Celsius (temperature range in Fahrenheit)',
            '🌧️ Season: temperature range in Celsius (temperature range in Fahrenheit)',
            '❄️ Season: temperature range in Celsius (temperature range in Fahrenheit)'
            ],
            "location": {
            "city": "name of the city or region",
            "coordinates": [latitude, longitude],
            "openStreetMap": "link to open street map"
            },
            "itinerary": [
            {
            "day": 1,
            "location": "City/Region Name",
            "activities": [
                {"time": "Morning", "description": "🏰 Visit the local historic castle and enjoy a scenic walk"},
                {"time": "Afternoon", "description": "🖼️ Explore a famous art museum with a guided tour"},
                {"time": "Evening", "description": "🍷 Dine at a rooftop restaurant with local wine"}
            ]
            },
            ...
            ]
            }`;

        const textResult = await genAI.getGenerativeModel({ model: "gemini-2.0-flash" }).generateContent([prompt]);
        const tripText = textResult.response.text();
        console.log("AI Response received");

        const trip = parseMarkdownToJson(tripText);
        if (!trip) {
            console.error("Failed to parse AI response as JSON:", tripText);
            return data({ error: "Не удалось обработать ответ от ИИ. Попробуйте еще раз." }, { status: 500 });
        }

        console.log("Fetching images from Unsplash...");
        const imageResponse = await fetch(`https://api.unsplash.com/search/photos?query=${country} ${interests} ${travelStyle}&client_id=${unsplashApiKey}`);
        const imageData = await imageResponse.json();
        const imageUrls = imageData.results?.slice(0, 3).map((result: any) => result.urls?.regular || null) || [];

        console.log("Saving trip to Appwrite...");
        const result = await database.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.tripsCollectionId,
            ID.unique(),
            {
                tripDetail: JSON.stringify(trip),
                createdAt: new Date().toISOString(),
                imageUrls,
                userId
            }
        )

        const tripDetail = parseTripData(result.tripDetail);
        if (!tripDetail) {
            console.error("Failed to parse saved trip detail");
            return data({ error: "Ошибка при сохранении данных путешествия." }, { status: 500 });
        }

        const tripPrice = parseInt(tripDetail.estimatedPrice.replace(/[^0-9]/g, ''), 10) || 100;

        console.log("Creating Stripe payment link...");
        const paymentLink = await createProduct(
            tripDetail.name,
            tripDetail.description,
            imageUrls,
            tripPrice,
            result.$id
        );

        console.log("Updating trip with payment link:", paymentLink.url);
        await database.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.tripsCollectionId,
            result.$id,
            {
                payment_link: paymentLink.url
            }
        )

        return data({ id: result.$id });
    } catch (e: any) {
        console.error("Error generating travel plan:", e);

        let errorMessage = "Произошла внутренняя ошибка сервера. Пожалуйста, попробуйте позже.";

        if (e.message?.includes("429")) {
            errorMessage = "Лимит запросов к ИИ исчерпан (Free Tier). Пожалуйста, подождите минуту или попробуйте позже.";
        } else if (e.message?.includes("404")) {
            errorMessage = "Модель ИИ временно недоступна. Пожалуйста, свяжитесь с поддержкой.";
        } else if (e.message?.includes("API key")) {
            errorMessage = "Ошибка конфигурации API ключа. Проверьте настройки сервера.";
        }

        return data({ error: errorMessage }, { status: 500 });
    }
}