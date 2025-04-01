import React, {useCallback, useState} from "react";
import {useDropzone} from "react-dropzone";
import axios from 'axios';
import './App.css';

function App() {

  const onDrop = useCallback((acceptedFiles)=>{
    setFiles(acceptedFiles);
  },[]);

  const [files,setFiles] = useState([]);
  const {getRootProps, getInputProps} = useDropzone({onDrop});
  const [responseData, setResponseData] = useState(null);
  const [loading,setLoading] = useState(false);
  const [isClickedSendAll, setClickedSendAll]= useState(false);
  const [hoverIndex, setHoverIndex] = useState(null);
  const clickGetButton = async() =>{
    setLoading(true);
    if (files.length === 0) {
      alert("파일을 먼저 선택하세요");
      return;
    } 

    const formData = new FormData(); //FormData는 서버에 텍스트(json)파일이 아닌 real 파일,itself를 보내기 위한 클래스!
    formData.append("file",files[0]);

    try {
      const response = await axios.post('http://localhost:5000/getContents', formData, {
        headers : {
          "Content-Type":"multipart/form-data",
        },
      });

      const rawData = response.data.data;
      const dataWithStatus = rawData.map((row)=>({
        ...row,
        발송상태 : "대기"
      }));
      console.log(dataWithStatus)
      setResponseData(dataWithStatus);

    } catch (error) {
      alert("서버 응답:",error);
      console.error("파일 업로드 실패:",error);
    }
    setLoading(false);
  };

    const clickSendButton = async(trackingNum,productOrderId) => {
      setLoading(true);
      try {
        const response = await axios.post('http://localhost:5000/sendPackages',{
          trackingNum, 
          productOrderId
        });
        alert(response.data['message'])
        
        const resultStatus = response.data["status"];
        const updatedData = responseData.map((item)=> {
          if(item.운송장번호 === trackingNum && item.상품주문번호 ===productOrderId){
            return {...item, 
              발송상태 : resultStatus === "success" ? "발송완료" : "오류"};
          }
          return item;
        });

        setResponseData(updatedData);

      } catch (error) {
        console.error("발송처리 실패:",error);
      }
      setLoading(false);
    };

    const clickSendAllButton = async() => {
      setClickedSendAll(true);
      setLoading(true);
      const updatedData = [...responseData];
      for (let i = 0; i< updatedData.length; i++){
        const item = updatedData[i];
        if (item.발송상태 === "대기"){
          try {
            const response = await axios.post('http://localhost:5000/sendPackages',{
              trackingNum: item.운송장번호,
              productOrderId: item.상품주문번호
            });
            const status = response.data.status;
            updatedData[i].발송상태 = status === "success" ? "발송완료" : "오류";
            console.log(item)
          } catch(err){
            updatedData[i].발송상태 = "오류";
            console.error("발송 실패:",err);
          }
        }
      }
      setResponseData(updatedData);
      setLoading(false);

      const successCount = updatedData.filter(item => item.발송상태 ==="발송완료").length;
      alert(`발송 시도 건 : ${updatedData.length}, 발송 성공 건 : ${successCount}`)
    }

  return (
    <div className={loading ? "disabled-div bg-white" : "bg-white"}>
      <h1 className="text-4xl font-extrabold flex items-center justify-center py-6">운송장 자동 등록</h1>
      {files.length>0 ? 
       (
       <div>
        <div>
          <p className="text-lg flex py-2 px-3"> 선택된 파일 : {files.length >0 ? files[0].name : "파일을 선택하세요"}</p>
        </div>
          <div className="px-2">
            <button
              onClick={clickGetButton}
              className="bg-gray-300 py-1 px-2 my-5 rounded-lg text-black cursor-pointer">
              파일내용 불러오기 
            </button>
          </div>

          {/* 서버에서 받은 데이터를 화면에 표시 */}
          {responseData && (
                      <div>
                        <button
                          onClick={clickSendAllButton} 
                          disabled={isClickedSendAll}
                          className={
                            isClickedSendAll 
                              ? "bg-gray-200 font-bold w-full h-20 text-2xl mb-10"
                              : "bg-green-300 font-bold w-full h-20 text-2xl mb-10 hover:bg-green-400 "
                            }>
                            전체 발송
                        </button>
                        <table className="w-full border-collapse border border-gray-300">
                          <thead>
                            <tr className = "bg-gray-100">
                              <th className="border">운송장번호</th>
                              <th className="border">고객주문번호</th>
                              <th className="border">상품주문번호</th>
                              <th className="border">상 태</th>
                            </tr>
                          </thead>
                          <tbody>
                            {responseData.map((item, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="p-1 border border-gray-300 text-center">{item.운송장번호}</td>
                                <td className="p-1 border border-gray-300 text-center">{item.고객주문번호}</td>
                                <td className="p-1 border border-gray-300 text-center">{item.상품주문번호}</td>
                                <td className="p-1 border border-gray-300 text-center">
                                {item.발송상태 ==="발송완료" ? (
                                    <button className="bg-gray-200  px-4 rounded-lg font-bold w-24 " disabled>발송완료</button>
                                  ) : item.발송상태 ==="오류" ?(
                                    <button className="bg-red-300 px-4 rounded-lg font-bold hover:bg-yellow-400 w-24"
                                            onClick={()=> clickSendButton(item.운송장번호,item.상품주문번호)}
                                            onMouseEnter={()=> setHoverIndex(index)}
                                            onMouseLeave={()=> setHoverIndex(null)}>
                                      {hoverIndex === index ? '재시도' : '발송실패'}
                                    </button>
                                  ) : (
                                    <button
                                      className="bg-green-300 px-4 rounded-lg font-bold hover:bg-green-400 w-24"
                                      onClick={() => clickSendButton(item.운송장번호, item.상품주문번호)}
                                    >
                                      발 송
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
        </div>
        ) :  (
          <div {...getRootProps()} className="h-96 border-4 border-dashed border-blue-400 rounded-2xl flex flex-col items-center justify-center text-gray-600 hover:shadow-2xl hover:border-blue-700 transition duration-300 cursor-pointer bg-gradient-to-br from-white to-blue-50">
          <input {...getInputProps()} />
          <svg className="w-16 h-16 text-blue-400 mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4l4 4M4 16.5v.5a2.5 2.5 0 002.5 2.5h11a2.5 2.5 0 002.5-2.5v-.5" />
          </svg>
          <p className="font-semibold text-lg">파일을 드래그하거나 클릭하여 업로드</p>
          <p className="text-sm text-gray-400 mt-1">(엑셀파일만 업로드 가능합니다)</p>
        </div>
        )}
    </div>
  );
}
export default App;