import { Request, Response } from "express";
export let privacy = (req: Request, res: Response) => {
  res.render("privacypolicy", {
    title: "Home"
  });
};

export let terms = (req: Request, res: Response) => {
    res.render("terms", {
      title: "Home"
    });
  };