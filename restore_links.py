import http.client
import json

def post_data(endpoint, data):
    conn = http.client.HTTPSConnection("cxormcjxqjtxzrofmwnk.supabase.co")
    headers = {
        "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4b3JtY2p4cWp0eHpyb2Ztd25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NDc3NjIsImV4cCI6MjA4OTIyMzc2Mn0.R2iqz7JnnMssL46avXwg4b4xLBvN_h7yz7GOgb4tjYk",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4b3JtY2p4cWp0eHpyb2Ztd25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NDc3NjIsImV4cCI6MjA4OTIyMzc2Mn0.R2iqz7JnnMssL46avXwg4b4xLBvN_h7yz7GOgb4tjYk",
        "Content-Type": "application/json"
    }
    conn.request("POST", f"/rest/v1/{endpoint}", json.dumps(data), headers)
    response = conn.getresponse()
    print(f"POST {endpoint}: {response.status} {response.reason}")
    conn.close()

# 1. Task Assignees
assignees = [
    {"task_id": 1, "member_id": 3},
    {"task_id": 2, "member_id": 2},
    {"task_id": 3, "member_id": 4},
    {"task_id": 4, "member_id": 3},
    {"task_id": 5, "member_id": 2},
    {"task_id": 8, "member_id": 3},
    {"task_id": 12, "member_id": 1}
]
post_data("task_assignees", assignees)

# 2. Issues
issues = [
    {"title": "API 응답 지연", "content": "SK 텔링크 정산 API 응답 속도가 간헐적으로 느려짐", "status": "Issue", "priority": "Critical", "project_id": 1, "assignee_id": 3},
    {"title": "안드로이드 폰트 깨짐", "content": "특정 기기에서 폰트 렌더링 이슈 발생", "status": "In Progress", "priority": "Warning", "project_id": 2, "assignee_id": 4}
]
post_data("issues", issues)

# 3. Project Members
proj_members = [
    {"project_id": 1, "member_id": 1}, {"project_id": 1, "member_id": 2}, {"project_id": 1, "member_id": 3},
    {"project_id": 2, "member_id": 1}, {"project_id": 2, "member_id": 4}, {"project_id": 2, "member_id": 3},
    {"project_id": 3, "member_id": 2}, {"project_id": 3, "member_id": 4}
]
post_data("project_members", proj_members)
