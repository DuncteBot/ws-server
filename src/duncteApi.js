import axios from 'axios';

export function init() {
    axios.defaults.headers['User-Agent'] = 'DuncteBot-WS-Server / dunctebot.com';
    axios.defaults.headers['Authorization'] = process.env.TOKEN;
    axios.defaults.baseURL = 'https://apis.duncte123.me/';
    // axios.defaults.baseURL = 'http://duncte123-apis-lumen.test/';
}

export async function verifyToken(token) {
    try {
        const { data } = await axios.get('/bot/validate-token', {
            params: {
                the_token: token,
                bot_routes: true,
            }
        });

        return data.success;
    } catch (e) {
        console.log(e.response);

        return false;
    }
}
