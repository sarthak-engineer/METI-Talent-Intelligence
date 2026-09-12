import re

def is_substantive_response(text: str, prompt: str = "") -> bool:
    if not text:
        return False
        
    cleaned_text = text.strip()
    if len(cleaned_text) < 15:
        return False
        
    words = re.findall(r'\b\w+\b', cleaned_text)
    if len(words) < 4:
        return False
        
    char_set = set(cleaned_text.lower().replace(" ", ""))
    if len(char_set) < 5:
        return False
        
    if len(cleaned_text) > 20:
        text_no_spaces = cleaned_text.replace(" ", "")
        if text_no_spaces:
            max_freq = max(text_no_spaces.count(c) for c in char_set)
            if max_freq > len(text_no_spaces) * 0.5:
                return False
                
    if prompt:
        cleaned_prompt = prompt.strip()
        if len(cleaned_prompt) > 10 and (cleaned_text in cleaned_prompt or cleaned_prompt in cleaned_text):
            return False
            
    return True
