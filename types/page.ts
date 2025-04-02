export interface Page {
  params: {
    owner: string;
    repo: string;
    branch: string;
    name: string;
  }
}

export interface PageWithPath extends Page {
  params: {
    path: string;
  } & Page["params"];
}

export interface PageNameOnly {
  params: {
    name: string;
  }
}
