import time
import bcrypt
import pybase64 
import requests
import urllib.parse
import http.client
import json
from datetime import datetime
import pytz
import pandas as pd

from dotenv import load_dotenv
import os

load_dotenv()
client_id = os.getenv("client_id")
clientSecret = os.getenv("clientSecret")

conn = http.client.HTTPSConnection("api.commerce.naver.com")

#발송처리 dispatchData 포멧
def dispatchDataFormator():
    korea_tz = pytz.timezone("Asia/Seoul")
    current_time = datetime.now(korea_tz)
    formatted_time = current_time.strftime("%Y-%m-%dT%H:%M:%S.%f%z")
    formatted_time = formatted_time[:-9] + formatted_time[-6:-2] + ":" + formatted_time[-2:]
    return formatted_time

#토큰발급
def get_bearer_token(client_id,clientSecret,type_="SELF"):

    timestamp = str(int((time.time()-3)*1000))
    password = client_id + "_" + timestamp
    hashed = bcrypt.hashpw(password.encode('utf-8'),clientSecret.encode('utf-8'))
    client_secret_sign = pybase64.standard_b64encode(hashed).decode('utf-8')
    headers = {"content-type": "application/x-www-form-urlencoded"}
    
    data_= {
        "client_id" : client_id,
        "timestamp" : timestamp,
        "client_secret_sign" : client_secret_sign,
        "grant_type" : "client_credentials",
        "type" : type_
    }
    query = urllib.parse.urlencode(data_)
    oauth_url = "http://api.commerce.naver.com/external/v1/oauth2/token?" + query

    response = requests.post(url=oauth_url, headers=headers)
    response_data = response.json()  # .json() : response데이터를 파이썬 딕셔너리 형태로 변환한다.
    
    if 'access_token' in response_data :
        return response_data['access_token']
    else :
        print("토큰 요청 실패, 재시도")
        time.sleep(1)
        return get_bearer_token(type_)
    
token = get_bearer_token(client_id,clientSecret)
    
#주문번호로 상품주문번호 가져오기 : 상품주문번호가 여럿 있을 경우에는 첫 주문만 가져옴 => 개발중
def productOrderIdGetter(orderId,token):
    try : 
        headers = { 'Authorization': f"{token}" }
        conn.request("GET", f"/external/v1/pay-order/seller/orders/{orderId}/product-order-ids", headers=headers)
        res = conn.getresponse()
        data = res.read()
        data = data.decode("utf-8")
        data = json.loads(data)
        return data["data"]
    except Exception as e:
        print(f"에러발생 : {e}")

#엑셀파일에서 운송장번호 , 주문번호 추출 (스마트스토어전용) + 상품주문번호열 추가하는 중...
def extractTrackingNum(file_path):
    df = pd.read_excel(file_path) #pd.read_excel(file_path) : 엑셀파일을 읽어 이차원 테이블 형식의 데이터로 정리한다.
    extracted_data = df.loc[0:, ["운송장번호", "고객주문번호"]] #df.loc[] 를 이용하면 행(첫번째부터 57번째 행까지)과 열(운송장번호,고객주문번호)을 선택할 수 있다. // df.loc[행이름,열이름] : loc는 이름기반반
    extracted_data["운송장번호"] = extracted_data["운송장번호"].astype(str).str.replace("-", "", regex=False) #운송장 포맷 바꾸기 (하이픈빼기)
    filtered_data = extracted_data[extracted_data["고객주문번호"].astype(str).str.len() == 16].copy()#해석하자면 extracted_data인데 조건[해당 data의 고객주문번호 타입의 len이 16인]에 해당하는 extracted_data만 보는 것.
    filtered_data.reset_index(drop=True, inplace=True) #인덱스재정렬
    filtered_data["상품주문번호"] = ""

    for i in range(filtered_data.shape[0]):
        orderId = filtered_data.loc[i,"고객주문번호"]
        productOrderId = productOrderIdGetter(orderId,token)
        # if len(productOrderId)>1 :
        #     for j in range(len(productOrderId)):
        #         # 갯수의 -1 만큼 그 아래 행을 추가하고 "고객주문번호"에 data["data"][1], data["data"][2].. 를 기입한다.
        #         filtered_data.loc[i,"상품주문번호"] = productOrderId[j]       
        #          # 운송장번호와 고객주문번호는 동일하게 추가한다.
        # else : 
        filtered_data.loc[i,"상품주문번호"] = productOrderId[0]
        print(productOrderId)
        time.sleep(0.5)
    return filtered_data

#발송처리
def insertTrackingNum(conn, productOrderId,trackingNum) : 
    formatted_time = dispatchDataFormator()
    data = {
        "dispatchProductOrders" : [{
            "productOrderId": f"{productOrderId}",
            "deliveryMethod": "DELIVERY",
            "deliveryCompanyCode": "CJGLS",
            "trackingNumber": f"{trackingNum}",
            "dispatchDate": f"{formatted_time}"
        }]
    }
    payload = json.dumps(data, ensure_ascii=False)
    token = get_bearer_token()
    headers = {
        'Authorization': f"Bearer {token}",
        'content-type': "application/json"
        }
    conn.request("POST", "/external/v1/pay-order/seller/product-orders/dispatch", payload, headers)
    res = conn.getresponse()
    data = res.read()
    print("Response:", data.decode("utf-8"))


sample = extractTrackingNum("파일접수 상세내역_30545779_20250311131133_dasada_sc.xlsx")
print(sample)
