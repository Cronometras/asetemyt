import {createApp} from 'astro/app/entrypoint';
import {createPagesHandler} from './handler.mjs';
export default createPagesHandler(createApp());
