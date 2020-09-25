import ky from 'ky';

const api = ky.create({
    // prefixUrl: 'https://apis.duncte123.me/',
    prefixUrl: 'http://duncte123-apis-lumen.test/',
    headers: {
        'Authorization': process.env.TOKEN
    },
});

export async function verifyToken(token) {
    const parsed = await api.get('/bot/verify-token', {
        searchParams: {
            the_token: token,
            bot_routes: true,
        }
    }).json();

    return parsed.success;
}
