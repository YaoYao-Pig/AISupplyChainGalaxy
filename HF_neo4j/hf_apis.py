# coding: utf-8

# Author: Mingzhe Du (mingzhe@nus.edu.sg)
# Date: 2024-12-20

import requests
import huggingface_hub

class HF_API:
    def __init__(self, hf_token, sort, model_limit) -> None:
        self.hf_token = hf_token
        self.sort = sort
        self.model_limit = model_limit

    def get_models(self):
        for model in huggingface_hub.list_models(sort=self.sort, limit=self.model_limit):
            yield model.id

    def get_model_details(self, model_id):
        response = requests.get(f"https://huggingface.co/api/models/{model_id}", params={}, headers={"Authorization": f"Bearer {self.hf_token}"})
        return response.json()
    
    def get_model_list(self, relation_type, model_id):
        model_list = list()
        page_index = 0
        while True:
            url = f"https://huggingface.co/models-json?other=base_model%3A{relation_type}%3A{model_id}&p={page_index}&sort=trending&withCount=false"
            payload = {}
            headers = {
                'accept': '*/*',
                'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8,zh-CN;q=0.7,zh-HK;q=0.6,zh-TW;q=0.5,zh;q=0.4',
                'cookie': '__stripe_mid=b0d0777d-031c-40aa-a09a-2edc9f9b032f8e4c73; token=[YOUR_TOKEN]; _gcl_au=1.1.666042015.1726250984; ph_phc_Tbfg4EiRsr5iefFoth2Y1Hi3sttTeLQ5RV5TLg4hL1W_posthog=%7B%22distinct_id%22%3A%22191ec93aa619db-07fffea5cc9d82-17525637-16a7f0-191ec93aa62352d%22%2C%22%24device_id%22%3A%22191ec93aa619db-07fffea5cc9d82-17525637-16a7f0-191ec93aa62352d%22%2C%22%24user_state%22%3A%22anonymous%22%2C%22%24sesid%22%3A%5B1726251001516%2C%22191ec93aaaca7-0bf47bcfd61f63-17525637-16a7f0-191ec93aaad44eb%22%2C1726250986156%5D%2C%22%24session_recording_enabled_server_side%22%3Afalse%2C%22%24autocapture_disabled_server_side%22%3Afalse%2C%22%24active_feature_flags%22%3A%5B%5D%2C%22%24enabled_feature_flags%22%3A%7B%7D%2C%22%24feature_flag_payloads%22%3A%7B%7D%7D; _ga_CM1E1N1Q4R=GS1.1.1726250983.1.1.1726252390.0.0.0; _ga=GA1.2.1197305794.1725122777; __stripe_sid=9b8a6cde-0085-41a3-9821-95fe15962ed62f6fb0; aws-waf-token=1be10596-ab80-444b-a810-0e39c7a3231f:BgoAhpoxJWs9AQAA:Hix+RtsX4cRVyXXDvWaNpGXxjrNOPmr8IkNSwWd1tjJzYw7RRy5R+EkdbKceoZ0HHaRSr+7esxSaGiDFcns4rpTJ5xWWbPdgw9cA7O2pqkER4eX5m4YOU0irVYArq0jV5KSZx4ZuNaxrwPLoQSXqMrZUg+qjSMk8nRF7+n/zg+2yzw+BKfx5sy2mNUydmw4sOq4yYfoBttTmnxkIlcNjZuN0h5uM2FY7mf8BgXYlaUBps8F8ykgWICE44VZSg2sjQ9FKwcU=',
                'if-none-match': 'W/"38e8-cVFiB/fvlj7mglMdT0MZ+lbvPJ8"',
                'priority': 'u=1, i',
                'referer': 'https://huggingface.co/models?other=base_model:finetune:meta-llama%2FLlama-3.2-1B&p=1&sort=trending',
                'sec-ch-ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
            }
            raw_response = requests.request("GET", url, headers=headers, data=payload)
            try:
                response =  raw_response.json()
                models = response['models']
                if len(models) == 0:
                    break
                model_list.extend(models)
                page_index += 1
            except:
                break
        return model_list
    
    def get_base_models(self, model_id):
        model_card = huggingface_hub.ModelCard.load(model_id, ignore_metadata_errors=True)
        model_card_data = model_card.data.to_dict()
        if 'base_model' in model_card_data:
            base_models = model_card_data['base_model']
            if isinstance(base_models, list):
                return base_models
            else:
                return [base_models]
        else:
            return []


if __name__ == "__main__":
    hf_api = HF_API("[YOUR_TOKEN]")   
    for model_id in hf_api.get_models():
        print(model_id)
