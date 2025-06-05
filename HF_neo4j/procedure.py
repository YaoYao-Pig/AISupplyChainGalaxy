# coding: utf-8

# Author: Mingzhe Du (mingzhe@nus.edu.sg)
# Date: 2024-12-20

import time
import json
import hf_apis
import neo4j_client
from tqdm import tqdm

# Environment setup
hf_api = hf_apis.HF_API(hf_token='[YOUR_TOKEN]', sort="trending_score", model_limit=1000)
graph = neo4j_client.Graph(url='bolt://localhost:7687', token='modeltree')

# Get all models from Hugging Face Hub
# for model_id in tqdm(hf_api.get_models()):
#     try:
#         print(f"[+] Processing model [{model_id}]...")

#         # Check if model exists
#         model_info = graph.get_node(model_id)
#         if model_info and 'visited' in model_info:
#             print(f"[-] Model [{model_id}] already visited. Skipped.")
#             continue
        
#         # Create model node
#         graph.create_node(model_id, 'Model')
#         graph.update_node(model_id, 'Model', {'visited': True})

#         # Get base models
#         base_models = hf_api.get_base_models(model_id)
#         for base_model_id in base_models:
#             print(f"[-] {model_id} --> Base Model --> {base_model_id}")
#             graph.create_node(base_model_id, 'Model')
#             graph.create_edge(model_id, base_model_id, 'BASE_MODEL')
        
#         # Get downstream models
#         for relation_type in ["finetune", "quantized", "merge", "adapter"]:
#             model_list = hf_api.get_model_list(relation_type, model_id)
#             for downstream_model in model_list:
#                 print(f"[-] {model_id} --> {relation_type} --> {downstream_model['id']}")
#                 graph.create_node(downstream_model['id'], 'Model')
#                 graph.create_edge(model_id, downstream_model['id'], relation_type.upper())

#     except Exception as e:
#         print(f"Error: {e}")
#         continue

# Get model details
model_ids = graph.get_fresh_nodes()

for model_id in tqdm(model_ids):
    try:
        print(f"[+] Processing model [{model_id}]...")

        # Check if model is up-to-date
        # model_info = graph.get_node(model_id)
        # if 'updated' in model_info and time.time() - model_info['updated'] < 604800:
        #     print(f"[-] Model [{model_id}] is up-to-date. Skipped.")
        #     continue
        
        # Update model details
        # print(f"[-] Retrieving and updating model details for [{model_id}]...")
        model_details = hf_api.get_model_details(model_id)

        model_info = {
            'model_id': model_id,
            'author': model_details['author'] if 'author' in model_details else "None",
            'lastModified': model_details['lastModified'] if 'lastModified' in model_details else "None",
            'createdAt': model_details['createdAt'] if 'createdAt' in model_details else "None",
            'tags': model_details['tags'] if 'tags' in model_details else [],
            'downloads': model_details['downloads'] if 'downloads' in model_details else 0,
            'likes': model_details['likes'] if 'likes' in model_details else 0,
            'siblings': json.dumps(model_details['siblings']) if 'siblings' in model_details else "None",
            'updated': time.time()
        }

        if 'cardData' in model_details:
            model_info['license'] =  model_details['cardData']['license'] if 'license' in model_details['cardData'] else "None",
            model_info['license_name'] = model_details['cardData']['license_name'] if 'license_name' in model_details['cardData'] else "None",
            model_info['license_link'] = model_details['cardData']['license_link'] if 'license_link' in model_details['cardData'] else "None",

        graph.update_node(model_id, 'Model', model_info)
    except Exception as e:
        print(f"Error: {e}\n")
        continue

print("Done!")