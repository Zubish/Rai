import { handleConnection } from '../../server/connection-http.mjs';
export default (request, response) => handleConnection(request, response, true);
