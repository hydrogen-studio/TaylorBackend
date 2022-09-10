import { Request, Response } from "express";
export let appGuide = (req: Request, res: Response) => {
  res.render("app_guide", {
    title: "Home"
  });
};

export let highSchoolGuide = (req: Request, res: Response) => {
    res.render("highschool_guide", {
      title: "Home"
    });
  };

export let collegeCorePlusGuide = (req: Request, res: Response) => {
  res.render("collegecoreplus_guide", {
    title: "Home"
  });
};