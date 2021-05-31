import request from 'request-promise-native';
import moment from 'moment';
import 'moment-timezone';

import { byAGS, zipForCity } from '../data/locationMappings';
import { capitalizeWord } from '../lib/util';

const EXPORT_WEATHER_URL = process.env.EXPORT_WEATHER_URL;


export const handleLocation = async (ctx) => {
    const location = byAGS[ctx.data.ags];
    return handleCity(ctx, location);
};

export const handleCity = async (ctx, location) => {
    ctx.track({
        category: 'Feature',
        event: 'Location',
        label: 'Wetter',
        subType: location.city,
    });

    const [
        weatherCurrent,
        weatherForecast,
    ] = await Promise.all([
        getWeather(location, 'current'),
        getWeather(location, 'forecast'),
    ]);

    const { place, data: currentData } = weatherCurrent;
    const { data: forecastData } = weatherForecast;
    const todayData = forecastData.forecasts[0];

    const textCurrent = `So sieht das Wetter gerade in ${place.name} aus:\n${
        currentData.temperature} Grad, ${currentData.status.description}`;

    const textTemperaturesDay = `Die Tagestemperaturen liegen zwischen ${
        todayData.minimumTemperature} und ${todayData.maximumTemperature} Grad.`;

    const textStatus =
`Morgens: ${capitalizeWord(todayData.statusMorning.description)}
Nachmittags: ${capitalizeWord(todayData.statusAfternoon.description)}
Abends: ${capitalizeWord(todayData.statusEvening.description)}`;

    const textNight = `In der Nacht ${todayData.statusNight.description} und Tiefstwert ${
        todayData.minimumTemperatureNight} Grad.`;

    const lastUpdate = moment(
        currentData.importedAt,
    ).tz('Europe/Berlin').format('DD.MM.YY, HH:mm');
    const textLastUpdate = `Zuletzt aktualisiert: ${lastUpdate}`;

    const messageText = `${textCurrent}\n\n${textTemperaturesDay}\n\n${textStatus}\n\n${
        textNight}\n\n${textLastUpdate}`;

    return ctx.reply(messageText);
};

const getWeather = async (location, controller) => {
    const zip = zipForCity[location.city];
    const response = await request.get({
        uri: `${EXPORT_WEATHER_URL}${controller}/getByQuery/${zip}`,
        json: true,
    });
    return response;
};
