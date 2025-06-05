# coding: utf-8

# Author: Mingzhe Du (mingzhe@nus.edu.sg)
# Date: 2024-12-20

from neo4j import GraphDatabase, basic_auth

class Graph:
    def __init__(self, url, token) -> None:
        self.url = url
        self.token = token
        self.driver = GraphDatabase.driver(self.url, auth=basic_auth("neo4j", self.token))

    def get_model_id(self, model_id) -> str:
        model_name = 'model_' + model_id.replace('-', '_').replace('/', '_').replace('.', '_')
        return model_name

    def create_node(self, node_id, node_type):
        with self.driver.session() as session:
            session.run(f"MERGE (n:{node_type} {{model_id: '{node_id}'}} ) ")
    
    def update_node(self, node_id, node_type, node_properties):
        with self.driver.session() as session:
            session.run(
                f"MATCH (n:{node_type} {{model_id: $node_id}}) "
                "SET n += $node_properties",
                node_id=node_id,
                node_properties=node_properties
            )
    
    def create_edge(self, node_1_id, node_2_id, edge_type):
        with self.driver.session() as session:
            session.run(
                f"MATCH (a:Model {{model_id: $node_id1}}), (b:Model {{model_id: $node_id2}}) "
                f"MERGE (a)-[:{edge_type}]->(b)",
                node_id1=node_1_id,
                node_id2=node_2_id,
            )

    def get_nodes(self):
        with self.driver.session() as session:
            result = session.run("MATCH (n) RETURN n")
            for record in result:
                yield record['n']['model_id']
    
    def get_fresh_nodes(self):
        with self.driver.session() as session:
            result = session.run("MATCH (n) WHERE n.updated IS NULL RETURN n")
            for record in result:
                yield record['n']['model_id']

    def get_node(self, model_id):
        with self.driver.session() as session:
            result = session.run(
                "MATCH (n:Model {model_id: $model_id}) RETURN n",
                model_id=model_id
            )
            result =  result.single()
            if result:
                return result['n']
            else:
                return None

if __name__ == "__main__":
    graph = Graph('modeltree!')
    result = graph.get_node('meta-llama/Llama-3.2-1232B')
    print(result)
