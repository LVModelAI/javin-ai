import { generateText } from "ai";
import { myProvider } from "../models";
import { getSiteContent } from "../tools/scrap-site";

export const getRelevantWebsiteContentAgent = async (userQuery: string) => {
  console.log("use prompt is -- ", userQuery);
  const response = await generateText({
    model: myProvider.languageModel("chat-model-small"),
    system: `\n
        You will explore the creditcoin site and docs and try to find anwer of user query. you have a web scrapping tool, that will return the page content in markdown format along with the links in that page. you have to pass the link of the site to scrap. you can use the tool multiple times with different links, which you think can contain the necessary information required to answer the users query. do not use the tool more than 5 times. If relavant information is spread accross pages, combine all the info and return it. do not summaries the information. `,
    prompt: JSON.stringify(`The user Query is ${userQuery}`),
    tools: {
      getSiteContent,
    },
  });
  return response;
};
