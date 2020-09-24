import ky from 'ky';

const api = ky.create({
    prefixUrl: 'https://apis.duncte123.me/'
});

export async function verifyToken(token) {
    const parsed = await api.get('/bot/verify-token', {
        searchParams: {
            the_token: token
        }
    }).json();

    return parsed.success;
}
