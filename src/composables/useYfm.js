/** YAML Front Matter wrapper for js-yaml (also js-yaml doesn't work natively in the browser). */

import { load } from 'js-yaml';

export default function useYfm() {
  
  const loadYfm = (text) => {
    let re = /^(-{3}(?:\n|\r)([\w\W]+?)(?:\n|\r)-{3})?([\w\W]*)*/
        , results = re.exec(text)
        , conf = {}
        , yamlOrJson;

    if ((yamlOrJson = results[2])) {
        conf = load(yamlOrJson, {json: true});
    }
    
    conf['body'] = results[3] || '';
    // Somehow the library returns the body with a new line at the beginning
    conf['body'] = conf['body'].replace(/^\n/, '');
    
    return conf;
  };
  
  return { loadYfm };
}
