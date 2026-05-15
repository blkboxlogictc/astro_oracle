import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import exploreRouter from "./explore";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(exploreRouter);

export default router;
